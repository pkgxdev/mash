#!/usr/bin/env -S pkgx deno run --allow-read

import { basename } from "https://deno.land/std@0.206.0/path/basename.ts";
import * as flags from "https://deno.land/std@0.206.0/flags/mod.ts";
import { dirname } from "https://deno.land/std@0.206.0/path/dirname.ts";

interface Script {
  fullname: string
  birthtime: Date
  description?: string
  avatar: string
  url: string
}

interface ApiScript {
  name: string
  fullname: string
  birthtime: Date
  description?: string
  avatar: string
  url: string
}

const args = flags.parse(Deno.args);
const input_json = args['current-api-json']
const index_json = args['index-json']

if (!input_json) throw new Error("--current-api-json must be set to the existing api.json file")
if (!index_json) throw new Error("--index-json must be set to the existing index.json file")

const existing = (JSON.parse(Deno.readTextFileSync(input_json)).scripts as ApiScript[]).reduce((acc, cur) => {
  acc[cur.name || cur.fullname] = cur
  return acc
}, {} as Record<string, ApiScript>)
const index = JSON.parse(Deno.readTextFileSync(index_json)).scripts as ApiScript[]
const rv: ApiScript[] = []

for (const script of index as Script[]) {
  const base = basename(script.fullname)
  if (existing[base] && existing[base].fullname == script.fullname) {
    rv.push(convert(script, base))
  } else if (existing[script.fullname]) {
    rv.push(convert(script, script.fullname))
  } else if (!existing[base] && dirname(script.fullname) != 'pkgxdev') {
    /// new owner of the basename for this script
    rv.push(convert(script, base))
  } else {
    /// someone already claimed this basename
    rv.push(convert(script, script.fullname))
  }
}

console.log(JSON.stringify({scripts: rv}, null, 2))


function convert(script: Script, name: string): ApiScript {
  const url = script.url.replace('github.com', 'raw.githubusercontent.com').replace('/blob', '');

  return {
    name,
    fullname: script.fullname,
    birthtime: script.birthtime,
    description: script.description,
    avatar: script.avatar,
    url,
  }
}