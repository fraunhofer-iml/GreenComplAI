#!/bin/sh
set -eu

# Archive only tracked files. Local .env files and ignored operational data
# must neither enter the scan log nor be copied into a publication snapshot.
scan_prefix=$(git rev-parse --show-prefix)
scan_root=$(git rev-parse --show-toplevel)
scan_tmp=$(mktemp -d)
trap 'rm -rf "$scan_tmp"' EXIT HUP INT TERM

if [ -n "${SCAN_HEAD:-}" ]; then
  scan_range=$SCAN_HEAD
  if [ -n "${SCAN_BASE:-}" ] && [ "$SCAN_BASE" != "0000000000000000000000000000000000000000" ]; then
    scan_range="$SCAN_BASE..$SCAN_HEAD"
  fi
  gitleaks git --redact=100 --no-banner --config .gitleaks.toml --log-opts="$scan_range -- ${scan_prefix:-.}" "$scan_root"
fi

git -C "$scan_root" archive --format=tar --output="$scan_tmp/source.tar" "HEAD${scan_prefix:+:${scan_prefix%/}}"
mkdir "$scan_tmp/source"
tar -xf "$scan_tmp/source.tar" -C "$scan_tmp/source"
gitleaks dir --redact=100 --no-banner --config .gitleaks.toml "$scan_tmp/source"
