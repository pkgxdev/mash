# ScriptHub

1. Fork [pkgxdev/scripthub]
   * 🚨 Forks of forks will not be indexed! 🚨
2. Add scripts to `./scripts/`
   * Use any shell or scripting language you like
   * Scripts must use a [`pkgx` shebang]
   * Debug and test locally with `pkgx ./scripts/script-name`
   * Scripts do not have to be made executable: but we recommend it
3. Optionally rewrite the README so there is a `## script-name` section
   * The paragraph after the `##` will be the scripthub description
   * A `### Usage` section will be listed to help users use your script
   * If you don’t provide usage then at some point we will use AI to try to
     generate it. Better you add it yourself tho right?
4. Push
5. Wait a bit and then check https://hub.pkgx.sh

Once published you can use scripts via `pkgx`:

```sh
$ pkgx sh your-script-name-without-extension
```

> If someone already took that name then you can still use it via:
>
> ```sh
> $ pkgx sh username/script
> ```

Hackers can use your script without installing `pkgx` first via our cURL
one-liner. This executes the script but doesn’t install pkgx or any other
pkgs.

```sh
sh <(curl https://pkgx.sh) sh your-script-name
```

Updates are fetched automatically, there is no versioning at this time.


[pkgxdev/scripthub]: https://github.com/pkgxdev/scripthub
[`pkgx` shebang]: https://docs.pkgx.sh/scripts
