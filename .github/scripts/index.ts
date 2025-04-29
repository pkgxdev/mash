#!/usr/bin/env -S pkgx deno^1 run --allow-run=bash --allow-read=.

import { join, basename, dirname } from "https://deno.land/std@0.206.0/path/mod.ts";
import { walk, exists } from "https://deno.land/std@0.206.0/fs/mod.ts";
import * as flags from "https://deno.land/std@0.206.0/flags/mod.ts";

if (import.meta.main) {
  const args = flags.parse(Deno.args);
  const inputdir = args['input']

  if (!inputdir) {
    console.error(`usage: index.ts --input <path>`);
    Deno.exit(1);
  }

  Deno.chdir(inputdir);

  const scripts: Script[] = []
  for await (const slug of iterateGitRepos('.')) {
    console.error(`iterating: ${slug}`);
    for (const script of await get_metadata(slug)) {
      switch (basename(script.fullname)) {
        case "cache":
        case "demo-test-pattern":
        case "ensure":
        case "inventory":
        case "pantry-inventory":
        case "ls":
        case "magic":
        case "prune":
        case "run":
        case "stub":
        case "upgrade":
        case "cache+prune":
        case "cache+ls":
        case "cache+upgrade":
        case "demo":
          if (!script.fullname.startsWith("mxcl/")) {
            // ignore stuff that was forked from when the root repo had scripts
            // these scripts are now on @mxcl/…
            continue;
          }
          // fallthrough
        default:
          scripts.push(script)
      }
    }
  }

  scripts.sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime());

  console.log(JSON.stringify({ scripts }, null, 2));
}

////////////////////////////////////////////////////////////////////// lib
async function extractMarkdownSection(filePath: string, sectionTitle: string): Promise<string | undefined> {
  const data = await Deno.readTextFile(filePath);
  const lines = data.split('\n');
  let capturing = false;
  let sectionContent = '';

  for (let line of lines) {
    line = line.trim();
    if (/^##\s+/.test(line)) {
      if (capturing) {
        break;  // stop if we reach another header section
      } else if (normalize_title(line.replace(/^#+/, '')) == normalize_title(sectionTitle)) {
        capturing = true;
      } else if (line.replace(/^#+/, '').trim() == mash_title(sectionTitle)) {
        capturing = true;
      } else if (line.replace(/^#+/, '').trim() == `\`mash ${sectionTitle}\``) {
        capturing = true;
      }
    } else if (capturing) {
      sectionContent += line + '\n';
    }
  }

  return chuzzle(sectionContent);

  function normalize_title(input: string) {
    return input.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }

  function mash_title(input: string) {
    const [category, ...name] = input.trim().split('-')
    return `\`mash ${category} ${name.join('-')}\``
  }
}

export interface Script {
  fullname: string  // the fully qualified name eg. user/category-script-name
  birthtime: Date
  description?: string
  avatar: string
  url: string
  README?: string
  cmd: string
}

async function* iterateGitRepos(basePath: string): AsyncIterableIterator<string> {
  for await (const entry of walk(basePath, { maxDepth: 2 })) {
    if (entry.isDirectory && await exists(join(entry.path, '.git'))) {
      yield entry.path;
    }
  }
}

function chuzzle(ln: string): string | undefined {
  const out = ln.trim()
  return out || undefined;
}

async function get_metadata(slug: string) {

  const cmdString = `git -C '${slug}' log --pretty=format:'%H %aI' --name-only --diff-filter=AR -- scripts`;

  const process = Deno.run({
    cmd: ["bash", "-c", cmdString],
    stdout: "piped"
  });

  const output = new TextDecoder().decode(await process.output());
  await process.status();
  process.close();

  const lines = chuzzle(output)?.split('\n') ?? [];
  const rv: Script[] = []
  let currentCommitDate: string | undefined;

  for (let line of lines) {
    line = line.trim()

    if (line.includes(' ')) {  // Detect lines with commit hash and date
      currentCommitDate = line.split(' ')[1];
    } else if (line && currentCommitDate) {
      const filename = join(slug, line)
      if (!await exists(filename)) {
        // the file used to exist but has been deleted
        console.warn("skipping deleted: ", filename, line)
        continue
      } else {
        console.warn("%cadding: ", 'color:green', filename, line)
      }

      const repo_metadata = JSON.parse(await Deno.readTextFile(join(slug, 'metadata.json')))

      const _stem = stem(filename).join('.')
      const README = await extractMarkdownSection(join(slug, 'README.md'), _stem);
      const birthtime = new Date(currentCommitDate!);
      const avatar = repo_metadata.avatar
      const fullname = join(dirname(slug), _stem)
      const url = repo_metadata.url +'/scripts/' + basename(filename)
      const description = README
        ? extract_description(README)
        : fullname == 'pkgxdev/demo-test-pattern'
          ? 'Prints a test pattern to your console'
          : undefined
      const cmd = `mash ${_stem}`

      rv.push({ fullname, birthtime, description, avatar, url, README, cmd })
    }
  }

  return rv;

  function stem(filename: string): string[] {
    const base = basename(filename)
    const parts = base.split('.')
    if (parts.length == 1) {
      return parts.slice(0, 1)
    } else {
      return parts.slice(0, -1) // no extension, but allow eg. foo.bar.js to be foo.bar
    }
  }
}

function extract_description(input: string) {
  const regex = /^(.*?)\n#|^.*$/ms;
  const match = regex.exec(input);
  return match?.[1]?.trim();
}
