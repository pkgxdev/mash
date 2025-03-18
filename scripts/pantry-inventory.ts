#!/usr/bin/env -S pkgx --quiet deno^1.40 run --ext=ts --allow-net=dist.pkgx.dev --allow-read --allow-env --allow-ffi --unstable-ffi

import { hooks, semver } from "https://deno.land/x/libpkgx@v0.18/mod.ts"
const { usePantry, useInventory } = hooks

const rv: Record<string, string[]> = {}
for (const arg of Deno.args) {
  const found = await usePantry().find(arg)
  const project = found[0].project
  const pkg = { project, constraint: new semver.Range('*') }
  const versions = await useInventory().get(pkg)
  rv[pkg.project] = versions.map(v => v.toString())
}

if (Object.keys(rv).length > 1) {
  console.log(JSON.stringify(rv, null, 2))
} else for (const version of Object.entries(rv)[0][1]) {
  console.log(version)
}
