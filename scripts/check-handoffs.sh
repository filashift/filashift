#!/usr/bin/env bash
# Report development handoffs that are not yet live.
# Usage: scripts/check-handoffs.sh [live_sha]   (default: https://filashift.com/release-commit.txt)
# Exit 0 = nothing pending, 1 = something pending or a ledger entry is not live.
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE=${REMOTE:-github}
LEDGER=docs/handoffs.tsv
git fetch -q "$REMOTE" '+refs/heads/dev/*:refs/remotes/'"$REMOTE"'/dev/*' --prune
LIVE=${1:-$(curl -fsS https://filashift.com/release-commit.txt | tr -d '[:space:]')}
git cat-file -e "$LIVE^{commit}" 2>/dev/null || { echo "FAIL live commit $LIVE unknown locally (fetch master)"; exit 1; }
status=0; now=$(date +%s)
while read -r ref; do
  [ -n "$ref" ] || continue
  b=${ref#refs/remotes/$REMOTE/}; tip=$(git rev-parse "$ref")
  if git merge-base --is-ancestor "$tip" "$LIVE"; then echo "live      $b ${tip:0:7}"; continue; fi
  row=$(awk -F'\t' -v t="$tip" '$2==t' "$LEDGER" || true)
  if [ -n "$row" ]; then
    integ=$(cut -f3 <<<"$row")
    if git merge-base --is-ancestor "$integ" "$LIVE"; then echo "live      $b ${tip:0:7} -> $integ"; continue; fi
    echo "NOT LIVE  $b ${tip:0:7} integrated as $integ but not in live $LIVE"; status=1; continue
  fi
  if [ -z "$(git cherry "$LIVE" "$tip" | grep '^+' || true)" ]; then echo "live      $b ${tip:0:7} (same patches)"; continue; fi
  age=$(( (now - $(git log -1 --format=%ct "$tip")) / 3600 ))
  echo "PENDING   $b ${tip:0:7} (${age}h old): $(git log -1 --format=%s "$tip")"; status=1
done < <(git for-each-ref --format='%(refname)' "refs/remotes/$REMOTE/dev/")
[ $status -eq 0 ] && echo "OK no pending handoffs (live $LIVE)"
exit $status
