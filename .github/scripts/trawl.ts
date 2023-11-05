#!/usr/bin/env -S pkgx deno run --allow-run --allow-net --allow-env=GH_TOKEN --allow-write=.

import * as flags from "https://deno.land/std@0.206.0/flags/mod.ts";

const args = flags.parse(Deno.args);
const outdir = args['out']

const ghToken = Deno.env.get("GH_TOKEN");
if (!ghToken) {
  console.error("error: GitHub token is required. Set the GH_TOKEN environment variable.");
  Deno.exit(1)
}

Deno.mkdirSync(outdir, { recursive: true });

async function cloneAllForks(user: string, repo: string) {
  let page = 1;
  while (true) {
    const response = await fetch(`https://api.github.com/repos/${user}/${repo}/forks?page=${page}`, {
      headers: {
        "Authorization": `token ${ghToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`err: ${response.statusText}`);
    }

    const forks = await response.json();
    if (forks.length === 0) {
      break;  // No more forks
    }

    for (const fork of forks) {
      await clone(fork)

      Deno.writeTextFileSync(`${outdir}/${fork.full_name}/metadata.json`, JSON.stringify({
        stars: fork.stargazers_count,
        license: fork.license?.spdx_id,
        avatar: fork.owner.avatar_url,
        url: fork.html_url + '/blob/' + fork.default_branch
      }, null, 2))
    }

    page++;
  }
}

async function clone({clone_url, full_name, ...fork}: any) {
  console.log(`Cloning ${clone_url}...`);
  const proc = new Deno.Command("git", { args: ["-C", outdir, "clone", clone_url, full_name]}).spawn()
  if (!(await proc.status).success) {
    throw new Error(`err: ${await proc.status}`)
  }
}

await cloneAllForks('pkgxdev', 'mash');

// we have some general utility scripts here
await clone({clone_url: 'https://github.com/pkgxdev/mash.git', full_name: 'pkgxdev/mash'});
// deploy expects this and fails otherwise
Deno.writeTextFileSync(`${outdir}/pkgxdev/mash/metadata.json`, `{
  "stars": 0,
  "license": "Apache-2.0",
  "avatar": "https://avatars.githubusercontent.com/u/140643783?v=4",
  "url": "https://github.com/pkgxdev/mash/blob/main"
}`)
