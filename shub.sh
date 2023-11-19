#!/bin/bash

set -eo pipefail

if test -n "$RUNNER_DEBUG" -a -n "$GITHUB_ACTIONS" -o -n "$VERBOSE"; then
  set -x
fi

SCRIPTNAME=$1
shift

if [ -z "$SCRIPTNAME" ]; then
  echo "usage: shub <scriptname> [args…]" 1>&2
  exit 64
fi

if [ "$(uname)" = Darwin ]; then
  CACHE="${XDG_CACHE_HOME:-$HOME/Library/Caches}/scripthub/$SCRIPTNAME"
else
  CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/scripthub/$SCRIPTNAME"
fi

get_etag() {
  grep -i ETag "$CACHE/headers.txt" | sed -e 's/ETag: "\(.*\)"/\1/' | tr -d '\r'
}

if [ -f "$CACHE/headers.txt" ] && ETAG=$(get_etag); then
  ETAG=(--header If-None-Match:\ $ETAG)
else
  mkdir -p "$CACHE"
fi

URL="https://pkgxdev.github.io/scripthub/$SCRIPTNAME"

if curl \
    $ETAG \
    --silent \
    --fail \
    --show-error \
    --dump-header "$CACHE/headers.txt" \
    --output "$CACHE/script" \
    "$URL"
then
  chmod +x "$CACHE/script"
  exec "$CACHE/script" "$@"
elif [ -f "$CACHE/$SCRIPTNAME" ]; then
  echo "warn: couldn’t update check" 1>&2
  exec "$CACHE/$SCRIPTNAME" "$@"
else
  echo "error: $URL" 1>&2
fi
