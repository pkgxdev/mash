#!/usr/bin/env -S pkgx deno run --allow-run --allow-net --allow-env=GH_TOKEN --allow-write=.

const ghToken = Deno.env.get("GH_TOKEN");
if (!ghToken) {
  console.error("error: GitHub token is required. Set the GH_TOKEN environment variable.");
  Deno.exit(1)
}

async function cloneAllForks(user: string, repo: string) {
  let page = 1;
  while (true) {
    const response = await fetch(`https://api.github.com/repos/${user}/${repo}/forks?page=${page}`, {
      headers: {
        "Authorization": `token ${ghToken}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch forks:', response.statusText);
      return;
    }

    const forks = await response.json();
    if (forks.length === 0) {
      break;  // No more forks
    }

    for (const fork of forks) {
      const cloneUrl = fork.clone_url;
      console.log(`Cloning ${cloneUrl}...`);
      const proc = new Deno.Command("git", { args: ["clone", cloneUrl, `${fork.full_name}`]}).spawn()
      if (!(await proc.status).success) {
        throw new Error(`err: ${await proc.status}`)
      }

      Deno.writeTextFileSync(`${fork.full_name}/metadata.json`, JSON.stringify({
        stars: fork.stargazers_count,
        license: fork.license.spdx_id,
        avatar: fork.owner.avatar_url
      }, null, 2))
    }

    page++;
  }
}

// Example usage:
await cloneAllForks('pkgxdev', 'scripthub');
