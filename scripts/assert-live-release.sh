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
archive=$(mktemp)
trap 'rm -f "$archive"' EXIT
url="/downloads/filashift-${GITHUB_SHA}.tar.gz"
page=$(curl -fsSL --max-time 30 "${BASE%/}/source")
[[ "$page" == *"href=\"$url\""* ]]
curl -fsSL --retry 2 --max-time 90 "${BASE%/}$url" -o "$archive"
python3 - "$archive" "$GITHUB_SHA" <<'PY'
import subprocess, sys, tarfile
archive, sha = sys.argv[1:]
expected = set(subprocess.check_output(["git","ls-tree","-r","--name-only","-z",sha]).decode().rstrip("\0").split("\0"))
with tarfile.open(archive, "r:gz") as tar:
    prefix = f"filashift-{sha}/"
    if tar.pax_headers.get("comment") != sha: sys.exit("Wrong source revision")
    files = [m.name for m in tar if not m.isdir()]
    if any(not f.startswith(prefix) for f in files) or {f[len(prefix):] for f in files} != expected:
        sys.exit("Source archive does not match the release file list")
print("Verified source offer, archive revision and release file list")
PY
