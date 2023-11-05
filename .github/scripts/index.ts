#!/usr/bin/env -S pkgx deno run --allow-run --allow-read=.

import { join, basename, dirname } from "https://deno.land/std@0.206.0/path/mod.ts";
import { walk, exists } from "https://deno.land/std@0.206.0/fs/mod.ts";
import * as flags from "https://deno.land/std@0.206.0/flags/mod.ts";

const args = flags.parse(Deno.args);
const outdir = args['out']

if (!outdir) {
  console.error(`usage: index.ts --out <path>`);
  Deno.exit(1);
}

Deno.chdir(outdir);

const rv: Script[] = []
for await (const slug of iterateGitRepos('.')) {
  if (slug == 'pkgxdev/scripthub') continue
  console.error(`iterating: ${slug}`);
  rv.push(...await get_metadata(slug));
}

rv.sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime());

console.log(JSON.stringify({ scripts: rv }, null, 2));


////////////////////////////////////////////////////////////////////// lib
async function extractMarkdownSection(filePath: string, sectionTitle: string): Promise<string | undefined> {
  const data = await Deno.readTextFile(filePath);
  const lines = data.split('\n');
  let capturing = false;
  let sectionContent = '';

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (capturing) break;  // stop if we reach another ## section
      if (normalize_title(line.slice(3)) == normalize_title(sectionTitle)) capturing = true;
    } else if (capturing) {
      sectionContent += line + '\n';
    }
  }

  return chuzzle(sectionContent);

  function normalize_title(input: string) {
    return input.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }
}

interface Script {
  fullname: string
  birthtime: Date
  description?: string
  avatar: string
  url: string
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

  const cmdString = `git -C '${slug}' log --pretty=format:'%H %aI' --name-only --diff-filter=A -- scripts`;

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
        console.warn("skipping deleted: ", filename)
        continue
      }

      console.error(line)

      const repo_metadata = JSON.parse(await Deno.readTextFile(join(slug, 'metadata.json')))

      const description = await extractMarkdownSection(join(slug, 'README.md'), basename(filename));
      const birthtime = new Date(currentCommitDate!);
      const avatar = repo_metadata.avatar
      const fullname = join(dirname(slug), ...stem(filename))
      // const excerpt = (await Deno.readTextFile(filename)).split("\n").slice(0, 5).join("\n")
      const url = repo_metadata.url +'/scripts/' + basename(filename)

      rv.push({ fullname, birthtime, description, avatar, url })
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
