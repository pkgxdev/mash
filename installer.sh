#!/bin/sh

set -e

if [ -n "$VERBOSE" -o -n "$GITHUB_ACTIONS" -a -n "$RUNNER_DEBUG" ]; then
  set -x
fi

if command -v mash >/dev/null; then
  if [ $# -gt 0 ]; then
    exec mash "$@"
  else
    echo "mash: already installed: $(which mash)" 1>&2
    exit 0
  fi
fi

if ! command -v pkgx >/dev/null; then
  if [ $# -gt 0 ]; then
    exec curl -Ssf https://pkgx.sh | sh -s -- +pkgx.sh/mash -- mash "$@"
  else
    curl -Ssf https://pkgx.sh | sh
  fi
fi

if [ $# -gt 0 ]; then
  exec pkgx +pkgx.sh/mash -- mash "$@"
else
  pkgx install mash

  if [ -f /usr/bin/which ]; then
    pkgxd="$(dirname "$(which pkgx)")"

    if [ ! -w "$pkgxd" ]; then
      SUDO=sudo
    fi

    $SUDO mv $HOME/.local/bin/mash "$pkgxd"
  fi

  echo "now type: mash" 1>&2
fi
