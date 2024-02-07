#!/usr/bin/env -S pkgx deno~1.39 run --unstable -A --ext=ts

import { hooks, semver, SemVer, utils, plumbing, Installation } from "https://deno.land/x/libpkgx@v0.18/mod.ts"
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts"
const { useConfig, useCellar } = hooks
const { link } = plumbing

const { args: pkgnames, options: flags } = await new Command()
  .name("pkgx cache prune")
  .arguments("[pkgspecs...]")
  .option("-d, --dryrun", "don’t do stuff, just print")
  .parse(Deno.args)

const versions: Record<string, SemVer[]> = {}
for await (const {pkg: {project, version}} of ls()) {
  versions[project] ??= []
  versions[project].push(version)
}

for (const project in versions) {
  switch (project) {
  case 'python.org':
  case 'node.org':
  case 'haskell.org':
    console.warn("not pruning", project, "due to laziness. PR welcome!")
    break
  default: {
    let pruned = false
    for (const version of versions[project].sort(semver.compare).slice(0, -1)) {
      const install = await useCellar().resolve({ project, version })
      //TODO only print if needs pruning
      console.error("pruning:", install.path)
      if (!flags.dryrun) install.path.rm({ recursive: true })
      pruned = true
    }
    if (!flags.dryrun && pruned) await repair(project)
  }}
}

async function* ls() {
  if (pkgnames.length == 0) {
    const stack = [useConfig().prefix]
    while (stack.length > 0) {
      const dir = stack.pop()!
      if (dir.string == useConfig().prefix.join('.local').string) continue
      for await (const {isDirectory, isSymlink, name} of Deno.readDir(dir.string)) {
        if (!isDirectory || isSymlink) continue

        const path = dir.join(name)
        const version = semver.parse(name.slice(1))

        if (/^v\d./.test(name) && version) {
          const project = path.parent().relative({ to: useConfig().prefix })
          yield { pkg: { project, version }, path }
        } else {
          // only descend if not a vx.y.z dir
          stack.push(path)
        }
      }
    }
  } else for (const pkgname of pkgnames) {
    const rq = utils.pkg.parse(pkgname)
    yield useCellar().resolve(rq)
  }
}

async function repair(project: string) {
  const cellar = useCellar()
  const installed = await cellar.ls(project)
  const shelf = cellar.shelf(project)

  for await (const [path, {isSymlink}] of shelf.ls()) {
    //FIXME shouldn't delete things we may not have created
    if (isSymlink) path.rm()
  }

  const majors: {[key: number]: Installation[]} = {}
  const minors: {[key: number]: Installation[]} = {}

  for (const installation of installed) {
    const {pkg: {version: v}} = installation
    majors[v.major] ??= []
    majors[v.major].push(installation)
    minors[v.minor] ??= []
    minors[v.minor].push(installation)
  }

  for (const arr of [minors, majors]) {
    for (const installations of Object.values(arr)) {
      const version = installations
        .map(({pkg: {version}}) => version)
        .sort(semver.compare)
        .slice(-1)[0] // safe bang since we have no empty arrays in above logic

      await link({project, version}) //TODO link lvl2 is possible here
    }
  }
}
