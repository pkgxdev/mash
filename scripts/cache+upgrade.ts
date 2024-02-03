#!/usr/bin/env -S pkgx deno~1.39 run --ext=ts --allow-read --unstable --allow-net --allow-ffi --allow-write --allow-env --allow-run

import { hooks, Path, plumbing, semver, SemVer } from "https://deno.land/x/libpkgx@v0.18/mod.ts"
import { walk } from "https://deno.land/std@0.214.0/fs/mod.ts"
const { useConfig, useInventory } = hooks
const { install, link } = plumbing

for await (const pkg of find()) {
  const [project, version] = (([project, version]) => {
    return [
      project.relative({ to: useConfig().prefix }),
      new SemVer(version)
    ]
  })(pkg.split())

  // breaks libpkgx semver shit sadly
  if (project == 'github.com/ggerganov/llama.cpp') continue

  console.error("checking:", project)
  const inventory = await useInventory().select({ project, constraint: new semver.Range('*') })

  if (!inventory || inventory.lte(version)) continue

  console.error("%cupdating%c: %s", 'color: yellow', 'color: reset', pkg)
  const installation = await install({ project, version: inventory })
  await link(installation)

  console.error("%cupgraded:%c %s", 'color: green', 'color: reset', installation.path)
}

//////////////////////// utils
async function *find(): AsyncGenerator<Path> {
  const match = [/\/v\*$/]
  const opts = { match, includeFiles: false }
  for await (const { path } of walk(useConfig().prefix.string, opts)) {
    yield new Path(path).readlink()
  }
}
