#!/bin/bash

set -euo pipefail

if [ "$#" -gt 1 ]; then
    echo "Usage: $0 <package>" 1>&2
    exit 1
fi

pkgx --quiet +$1 >/dev/null
major_version=$(pkgx --version | cut -d' ' -f2 | cut -d. -f1)
minor_version=$(pkgx --version | cut -d' ' -f2 | cut -d. -f2)

f=$(mktemp)

if ! [ "$major_version" -ge 2 -a "$minor_version" -ge 4 ]; then
    echo '#!/bin/sh' > "$f"
    echo "exec pkgx --quiet $1 \"\$@\"" >> "$f"
elif [ $(uname) = Darwin -a "$(command -v pkgx)" = "/usr/local/bin/pkgx" ]; then
    echo "#!/usr/local/bin/pkgx -q! $1" > "$f"
else
    echo "#!/usr/bin/env -S pkgx -q! $1" > "$f"
fi

sudo install -m 0755 "$f" /usr/local/bin/$1

echo "stub created: /usr/local/bin/$1" >&2
