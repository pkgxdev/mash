# `mash`

Mash up millions of open source packages into monstrously powerful scripts.

> [!CAUTION]
>
> We have not vetted any of the scripts `mash` can run and (currently) they
> can do anything they want to your computer.
>
> We fully intend to add sandboxing and user reporting, but you have found
> `mash` super early in its life so you must practice caution in your usage.
>
> All scripts can be read in advance via [mash.pkgx.sh]

&nbsp;

## Quick Start

```sh
brew install pkgxdev/made/mash || curl https://pkgx.sh | sh
```

> [!NOTE]
> `mash` is a plain POSIX script. All it needs is `bash`, `curl`, and `pkgx`.
> So if you like install the deps and just download it by itself.

## Getting Started

Visit [mash.pkgx.sh] to see what scripts are available. Once you’ve found a
script you want to run:

```sh
mash transcribe --help  # or https://mash.pkgx.sh/mxcl/transcribe
```

&nbsp;

## Contributing Scripts

### Writing Scripts

Use any shell or scripting language you like. You specify it with the shebang:

```sh
#!/usr/bin/env -S pkgx ruby
```

Generally it is sensible to specify constrained versions:

```sh
#!/usr/bin/env -S pkgx python@3.11
```

### Naming Scripts

Names are first-come, first served. Please practice taste. We reserve the
right to manage names.

> [!TIP]
> Extensions (eg. `.sh`, `.ts`) are *recommended* for GitHub readability.
> They will be stripped from the mash execution name, eg. `foo-bar.ts` is
> invoked via `mash foo-bar` and not `mash foo-bar.ts`

### Installing Language Dependencies

Many languages or interpreters nowadays provide clear methods for importing
language dependencies inside scripts, eg. `deno`, or `bun`. For other
languages, read on.

### JavaScript

Use `deno` or `bun`. If you must use `node` then use [`scriptisto`].

#### Rust

```rust
#!/usr/bin/env -S pkgx rust-script

//! ```cargo
//! [dependencies]
//! time = "0.1.25"
//! ```
```

> [!TIP]
> Probably you should specify a more precise Rust version as a plus-pkg arg.

#### Ruby

Use [Bundler](https://bundler.io):

```ruby
#!/usr/bin/env -S pkgx ruby@3

require 'bundler/inline'

gemfile do
  source 'https://rubygems.org'
  gem 'ruby-macho', '~> 3'
end
```

#### Python

Use `uvx`:

```python
#!/usr/bin/env -S pkgx +python@3.11 uv run --with requests<=3 --with rich

import requests
from rich.pretty import pprint

resp = requests.get("https://peps.python.org/api/peps.json")
data = resp.json()
pprint([(k, v["title"]) for k, v in data.items()][:10])

```

#### Go, Node, C/C++ etc.

Typically for everything else, use [`scriptisto`], eg for C:

```c
#!/usr/bin/env pkgx +clang +pkg-config scriptisto

#include <stdio.h>
#include <glib.h>

// scriptisto-begin
// script_src: main.c
// build_cmd: clang -O2 main.c `pkg-config --libs --cflags glib-2.0` -o ./script
// scriptisto-end

int main(int argc, char *argv[]) {
  gchar* user = g_getenv("USER");
  printf("Hello, C! Current user: %s\n", user);
  return 0;
}
```

Use `scriptisto new` for a full listing of platforms Scriptisto makes
available.

### Making your scripts available to `mash`

1. Fork [pkgxdev/mash]
2. Add scripts to `./scripts/`
3. Optionally edit the README adding a description for each script
4. Push to your fork
5. Wait an hour and then check [mash.pkgx.sh]

> [!NOTE]
> Do not create a pull request for your scripts against this repo!
> *We index the fork graph*.

> [!IMPORTANT]
> Step 3 (edit the README) is not optional if you want your script to appear
> on the [mash frontpage][mash.pkgx.sh]!

### Running Your Scripts

Assuming a script named `foo-bar`, while debugging just:

```sh
chmod +x scripts/foo-bar
./scripts/foo-bar
```

After pushing we will index your script within 60 minutes.
Once indexed your script can be run with:

1. `mash foo bar`; or
2. `mash your-username/foo-bar`

> [!IMPORTANT]
> `mash` will not be able to run your script until it is indexed.
> If you can visit https://mash.pkgx.sh/USERNAME/SCRIPT-NAME then your
> script has been indexed.

> [!NOTE]
>
> ### Naming Guidelines: A Call for Consideration
>
> Think for a little about the names you are picking. We reserve the right
> to rename egregious abuse of names and/or namespaces. If you feel a script
> is misnamed open a ticket for discussion.

&nbsp;


## Anatomy of Scripts

Thanks to [`pkgx`], `mash` scripts can be written in any scripting language
using any packages in the entire open source ecosystem.

### The Shebang

The shebang is where you instruct `pkgx` on what scripting language you want.
For example, if you want to write your script in `fish`:

```sh
#!/usr/bin/env -S pkgx fish
```

You can also use pkgx `+pkg` syntax to add additional packages to the script’s
running environment:

```sh
#!/usr/bin/env -S pkgx +gh +git +gum +bpb bash
```

pkgx knows what packages to cache (it doesn’t pollute the user system with
installs) based on the commands you want to run. There’s no figuring out
pkg names, just type what you would type to run the command.

> https://docs.pkgx.sh/scripts

### Documenting Your Script

Rewrite the README in your fork so there is a `## mash scriptname`
section. If your script is not the first to get a name then you would do
`## mash username/scriptname` instead.

* The paragraph after the `##` will be the [mash.pkgx.sh] description
  * Keep it short or it’ll get truncated when we display it
* If you add a `### Usage` section we’ll list it on the web

> [!IMPORTANT]
> If you don’t provide a description your script won’t be listed on the
> [mash frontpage][mash.pkgx.sh] (but the scripts can still be run by `mash`).

### Example Fork

https://github.com/mxcl/mash

&nbsp;


## Appendix

`mash` has no secret sauce; users can just cURL your scripts and run them
directly via `pkgx`:

```sh
curl -O https://raw.githubusercontent.com/mxcl/mash/main/scripts/transcribe
pkgx ./transcribe
```

Even `pkgx` isn’t required, they can source the dependencies themselves and
run the script manually:

```sh
$ bash ./transcribe
# ^^ they will need to read the script to determine deps and interpreter
```

Hackers can use your script without installing `pkgx` or `mash` first via our
cURL one-liner. This executes the script but doesn’t install anything:

```sh
sh <(curl https://mash.pkgx.sh) transcribe
```


[mash.pkgx.sh]: https://mash.pkgx.sh
[pkgxdev/mash]: https://github.com/pkgxdev/mash
[`pkgx` shebang]: https://docs.pkgx.sh/scripts
[`pkgx`]: https://pkgx.sh
[`scriptisto`]: https://github.com/igor-petruk/scriptisto
[actions]: https://github.com/pkgxdev/mash/actions
