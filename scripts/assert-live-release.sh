#!/usr/bin/env bash
# Exact comparison: a missing marker, fallback HTML or stale release must fail.
set -euo pipefail
: "${BASE:?Set the production origin}" "${GITHUB_SHA:?Set the expected commit}"
[[ $GITHUB_SHA =~ ^[0-9a-f]{40}$ ]]
marker=$(curl --fail --silent --show-error --connect-timeout 10 --max-time 25 \
  --retry 2 -H 'Cache-Control: no-cache' \
  "${BASE%/}/release-commit.txt?verify=${GITHUB_SHA}&t=$(date +%s%N)")
if [[ "$marker" != "$GITHUB_SHA" ]]; then
  [[ "$marker" =~ ^[0-9a-f]{40}$ ]] || marker="missing or invalid marker"
  printf 'Production mismatch: expected %s, observed %s. Rerun after deployment.\n' "$GITHUB_SHA" "$marker" >&2
  exit 1
fi
printf 'Verified production commit %s\n' "$GITHUB_SHA"
