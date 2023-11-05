# ScriptHub

> [!CAUTION]
>
> We have not vetted any of the scripts in ScriptHub and (currently) they can
> do anything they want to your computer.
>
> We fully intend to add sandboxing and user reporting, but you have found
> ScriptHub super early in its life so you must practice caution in your usage.
>
> All scripts can be read in advance via https://hub.pkgx.sh

## Getting Started

Most ScriptHub scripts require pkgx, so you may as well install ScriptHub
via [pkgx]:

```sh
# see https://pkgx.sh for `pkgx` installation instructions
$ sudo pkgx install hubx
```

> https://pkgx.sh

## Adding your Scripts to [hub.pkgx.sh][ScriptHub]

1. Fork [pkgxdev/scripthub]
2. Add scripts to `./scripts/`
3. Push to your fork
4. Wait an hour and then check https://hub.pkgx.sh

> [!TIP]
> * Use any shell or scripting language you like
> * Scripts do not need to use a [`pkgx` shebang] *but we recommend it*
> * Scripts do not have to be made executable *but we recommend it*

> [!NOTE]
> Do not create a pull request for your scripts against this repo!
> *We index the fork graph*.

> https://hub.pkgx.sh

### The Shebang

The shebang is where you instruct pkgx on what scriping language you want.
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

Rewrite the README in your fork so there is a `## script-name` section. We
lowercase the script filename, remove spaces and remove non-alphanumeric
characters. eg. `script-name` will match `## Script Name!`.

* The paragraph after the `##` will be the scripthub description
  * Keep the first line short so it isn’t truncated in our index
* A `### Usage` section will be listed to help users use your script
* If you don’t provide usage then at some point we will use AI to try to
  generate it. Better you add it yourself tho right?

### Debugging Scripts

You can easily test your scripts before publishing:

```sh
$ chmod +x scripts/my-script
$ scripts/my-script
```

### Example Fork

https://github.com/mxcl/scripthub

&nbsp;


## Using the Scripts

Once your scripts are visible at [ScriptHub] they can be used with the
ScriptHub cli `hubx`:

```sh
$ hubx your-script-name-without-extension
```

> [!NOTE]
> If someone already took that name then you can still use it via:
>
> ```sh
> $ hubx username/script
> ```

Notably, there is no secret sauce; users can just cURL the script and run it
directly via `pkgx`:

```sh
$ curl -O https://raw.githubusercontent.com/mxcl/scripthub/main/scripts/stargazer
$ pkgx ./stargazer
```

Even `pkgx` isn’t required, they can source the dependencies themselves and
run the script manually:

```sh
$ bash ./stargazer
# ^^ they will need to read the script to determine deps and interpreter
```

Hackers can use your script without installing `pkgx` first via our cURL
one-liner. This executes the script but doesn’t install pkgx or any other
pkgs.

```sh
sh <(curl https://pkgx.sh) hubx your-script-name
```

> [!NOTE]
> Updates are fetched automatically, there is no versioning at this time.


[pkgxdev/scripthub]: https://github.com/pkgxdev/scripthub
[`pkgx` shebang]: https://docs.pkgx.sh/scripts
[ScriptHub]: https://hub.pkgx.sh
[pkgx]: https://pkgx.sh