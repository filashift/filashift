#!/usr/bin/env bash
# Build and release FilaShift to the Droplet with an atomic swap and instant rollback.
# Usage: ./deploy/release.sh            (build + deploy)
#        ./deploy/release.sh --rollback (swap back to the previous release)
# Env: SSH_KEY (default ~/.ssh/filashift_ops), HOST (defaults to the production domain)
set -euo pipefail
HOST="${HOST:-root@filashift.com}"; KEY="${SSH_KEY:-$HOME/.ssh/filashift_ops}"
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new"
cd "$(dirname "$0")/.."
if [[ "${1:-}" == "--rollback" ]]; then
  $SSH "$HOST" 'set -e; cd /var/www; [ -d plateshift.old ] || { echo "no previous release"; exit 1; }; mv plateshift plateshift.tmp; mv plateshift.old plateshift; mv plateshift.tmp plateshift.old'
  echo "Rolled back."; exit 0
fi
[[ -z "$(git status --porcelain --untracked-files=normal)" ]] || { echo "Commit or remove pending changes before releasing." >&2; exit 1; }
REV=$(git rev-parse --verify HEAD)
python3 scripts/release-attribution.py verify "$REV"
npx tsc --noEmit -p .
VITE_RELEASE_SHA="$REV" npm run build
mkdir -p dist/public/downloads
git archive --format=tar.gz --prefix="filashift-$REV/" -o "dist/public/downloads/filashift-$REV.tar.gz" "$REV"
[[ "$(gzip -dc "dist/public/downloads/filashift-$REV.tar.gz" | { git get-tar-commit-id; cat >/dev/null; })" == "$REV" ]]
node scripts/prerender.mjs
# Always validate this candidate, never a BASE override pointing at the old site.
BASE= node scripts/check-converter-width.mjs
BASE= node scripts/check-csp.mjs
BASE= npm run test:release:mobile-en:shortcuts
BASE= npm run test:release:mobile-es:shortcuts
BASE= npm run test:release:mobile-es
rm -rf dist/public/data
# Shipped in the same atomic directory swap as the site, including on rollback.
printf '%s\n' "$REV" > dist/public/release-commit.txt
rm -f /tmp/filashift-site.zip; (cd dist/public && zip -qr /tmp/filashift-site.zip .)
scp -i "$KEY" -q /tmp/filashift-site.zip "$HOST":/tmp/site.zip
$SSH "$HOST" 'set -e; cd /var/www; rm -rf plateshift.new; mkdir plateshift.new; unzip -q /tmp/site.zip -d plateshift.new; chown -R caddy:caddy plateshift.new; rm -rf plateshift.old; mv plateshift plateshift.old; mv plateshift.new plateshift'
for u in https://filashift.com/ https://filashift.com/faq https://filashift.com/guides/3mf-to-stl https://filashift.com/sitemap.xml https://filashift.com/profiles/index.json https://filashift.com/fonts/fonts.css; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$u"); echo "$u $c"; [[ $c == 200 ]] || { echo "CHECK FAILED - run --rollback"; exit 1; }
done
$SSH "$HOST" "printf 'release %s %s\n' '$REV' \"\$(date -u +%FT%TZ)\" >> /var/log/filashift-releases.log"
echo "Released $REV."
