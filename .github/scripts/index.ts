#!/usr/bin/env -S pkgx deno run --allow-run=bash --allow-read=.

import { join, basename, dirname } from "https://deno.land/std@0.206.0/path/mod.ts";
import { walk, exists } from "https://deno.land/std@0.206.0/fs/mod.ts";
import * as flags from "https://deno.land/std@0.206.0/flags/mod.ts";
import { Path } from "https://deno.land/x/libpkgx@v0.16/mod.ts";

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
    scripts.push(...await get_metadata(slug));
  }

  scripts.sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime());

  const categories = (() => {
    const categories: Record<string, number> = {}
    for (const script of scripts) {
      if (script.category && script.description) {
        categories[script.category] ??= 0;
        categories[script.category]++;
      }
    }
    return Object.keys(categories)
  })();


  console.log(JSON.stringify({ scripts, categories }, null, 2));
}

////////////////////////////////////////////////////////////////////// lib
async function extractMarkdownSection(filePath: string, sectionTitle: string): Promise<string | undefined> {
  const data = await Deno.readTextFile(filePath);
  const lines = data.split('\n');
  let capturing = false;
  let sectionContent = '';

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (capturing) {
        break;  // stop if we reach another ## section
      } else if (normalize_title(line.slice(3)) == normalize_title(sectionTitle)) {
        capturing = true;
      } else if (line.slice(3).trim() == mash_title(sectionTitle)) {
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
  category?: string
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
      }

      console.error(line)

      const repo_metadata = JSON.parse(await Deno.readTextFile(join(slug, 'metadata.json')))

      const _stem = stem(filename).join('.')
      const README = await extractMarkdownSection(join(slug, 'README.md'), _stem);
      const birthtime = new Date(currentCommitDate!);
      const avatar = repo_metadata.avatar
      const fullname = join(dirname(slug), _stem)
      const url = repo_metadata.url +'/scripts/' + basename(filename)
      const category = (([x, y]) => x?.length > 0 && y ? x : undefined)(basename(filename).split("-"))
      const description = README
        ? extract_description(README)
        : slug == 'pkgxdev/demo-test-pattern'
          ? 'Prints a test pattern to your console'
          : undefined
      const cmd = category ? `mash ${category} ${_stem.split('-').slice(1).join('-')}` : `mash ${fullname}`

      rv.push({ fullname, birthtime, description, avatar, url, category, README, cmd })
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
