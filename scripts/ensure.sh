#!/usr/bin/env -S pkgx bash>=4 -eo pipefail

_main() {
  # check if all args begin with a +
  _EVAL=yes
  _SOME_PLUS=no
  for arg in "$@"; do
    if [ "${arg:0:1}" != "+" ]; then
      _EVAL=no
      break
    else
      _SOME_PLUS=yes
    fi
  done

  if [ $_EVAL = no -a $_SOME_PLUS = yes ]; then
    echo "ensure: unable to mix plus args with unplussed args" >&2
    exit 1
  fi

  if [ $_EVAL = yes ]; then
    _KEEP=()
    for arg in "$@"; do
      _CMD="${arg:1}"
      if ! _check_arg $_CMD; then
        _KEEP+=("$arg")
      fi
    done
    if [ ${#_KEEP[@]} -gt 0 ]; then
      exec pkgx -q "${_KEEP[@]}"
    fi
  elif _check_arg $1; then
    if [ $1 = python -a $(uname) = Darwin ]; then
      shift
      exec python3 "$@"
    else
      exec "$@"
    fi
  else
    exec pkgx -q "$@"
  fi
}

_check_arg() {
  if [ $(uname) = Darwin ]; then
    case $1 in
    python)
      test -f /Library/Developer/CommandLineTools/usr/bin/python3
      ;;
    make|python3|cc|c++|gcc|g++|clang|clang++|strip|git)
      test -f /Library/Developer/CommandLineTools/usr/bin/$1
      ;;
    esac
  fi
  command -v $1 >/dev/null 2>&1
}

_main "$@"
