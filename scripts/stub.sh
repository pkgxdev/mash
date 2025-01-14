#!/bin/bash

set -euo pipefail

if [ "$#" -gt 1 ]; then
    echo "Usage: $0 <package>" 1>&2
    exit 1
fi

pkgx +$1 >/dev/null

f=$(mktemp)

cat <<EoSH > "$f"
#!/bin/sh
exec pkgx $1 "\$@"
EoSH

sudo install -m 0755 "$f" /usr/local/bin/$1

echo "stub created: /usr/local/bin/$1" >&2
