#!/usr/bin/env -S pkgx deno run --allow-run --allow-read=.

import { walk, exists } from "https://deno.land/std@0.202.0/fs/mod.ts";
import { join, basename, dirname } from "https://deno.land/std@0.202.0/path/mod.ts";

const rv: Script[] = []
for await (const gitRepoPath of iterateGitRepos('.')) {
  console.error(`iterating: ${gitRepoPath}`);
  rv.push(...await get_birthtimes(gitRepoPath));
}

rv.sort((a, b) => a.birthtime.getTime() - b.birthtime.getTime());

console.log(JSON.stringify({ scripts: rv }, null, 2));


////////////////////////////////////////////////////////////////////// lib
async function extractMarkdownSection(filePath: string, sectionTitle: string): Promise<string | undefined> {
  const data = await Deno.readTextFile(filePath);
  const lines = data.split('\n');
  let capturing = false;
  let sectionContent = '';

  for (const line of lines) {
    if (capturing) {
      sectionContent += line + '\n';
    } else if (line.startsWith('## ')) {
      if (capturing) break;  // stop if we reach another ## section
      if (normalize_title(line.slice(3)) == normalize_title(sectionTitle)) capturing = true;
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

async function get_birthtimes(workingDirectory: string) {
  const dir = join(Deno.cwd(), workingDirectory)

  const cmdString = `git -C '${dir}' log --pretty=format:'%H %aI' --name-only --diff-filter=A -- scripts`;

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

  for (const line of lines) {
    if (line.includes(' ')) {  // Detect lines with commit hash and date
      currentCommitDate = line.split(' ')[1];
    } else {
      const filename = join(dir, line)
      if (!await exists(filename)) {
        // the file used to exist but has been deleted
        console.warn("skipping deleted: ", filename)
        continue
      }

      const description = await extractMarkdownSection(join(dir, 'README.md'), basename(filename));
      const birthtime = new Date(currentCommitDate!);
      const avatar = JSON.parse(await Deno.readTextFile(join(dir, 'metadata.json'))).avatar
      const fullname = dirname(workingDirectory) + '/' + stem(filename)

      rv.push({ fullname, birthtime, description, avatar })
    }
  }

  return rv;

  function stem(filename: string) {
    const base = basename(filename)
    const parts = base.split('.')
    if (parts.length == 1) {
      return parts[0]
    } else {
      return parts.slice(0, -1) // no extension, but allow eg. foo.bar.js to be foo.bar
    }
  }
}
