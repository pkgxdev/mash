#!/usr/bin/env -S pkgx deno run --allow-write=. --allow-read=.

import * as flags from "https://deno.land/std@0.206.0/flags/mod.ts";

interface ApiScript {
  name: string
  fullname: string
  birthtime: Date
  description?: string
  avatar: string
  url: string
}

const args = flags.parse(Deno.args)
const outdir = args['out']
const api_json = args['api-json']
const scripts = JSON.parse(await Deno.readTextFile(api_json)).scripts as ApiScript[]

for (const {name, fullname} of scripts) {
  if (name == fullname) continue
  Deno.copyFileSync(`${outdir}/${fullname}`, `${outdir}/${name}`)
}
