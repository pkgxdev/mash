#!/bin/sh

handler=$(cat <<EoHndlr
      if [ -t 2 ] && [ \$1 != pkgx ] && pkgx pkgx^1 --silent --provider \$1; then
        if pkgx gum confirm "^^ run that with \\\`pkgx\\\`?"; then
          pkgx "\$@"
        else
          return 127
        fi
      else
        echo "cmd not found: \$1" >&2
        return 127
      fi
EoHndlr
)

cat <<EoSH
if [ -n "\$ZSH_VERSION" ] && [ \$(emulate) = zsh ]; then
  eval '
    command_not_found_handler() {
      $handler
    }'
elif [ -n "\$BASH_VERSION" ] && [ "\$POSIXLY_CORRECT" != y ] ; then
  eval '
    command_not_found_handle() {
      $handler
    }'
else
  echo "pkgx: warning: unsupported shell" >&2
fi
EoSH
