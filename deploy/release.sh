#!/usr/bin/env bash
# Build and release FilaShift to the Droplet with an atomic swap and instant rollback.
# Usage: ./deploy/release.sh            (build + deploy)
#        ./deploy/release.sh --rollback (swap back to the previous release)
# Env: SSH_KEY (default ~/.ssh/filashift_ops), HOST (default root@167.99.104.154)
set -euo pipefail
HOST="${HOST:-root@167.99.104.154}"; KEY="${SSH_KEY:-$HOME/.ssh/filashift_ops}"
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new"
cd "$(dirname "$0")/.."
if [[ "${1:-}" == "--rollback" ]]; then
  $SSH "$HOST" 'set -e; cd /var/www; [ -d plateshift.old ] || { echo "no previous release"; exit 1; }; mv plateshift plateshift.tmp; mv plateshift.old plateshift; mv plateshift.tmp plateshift.old'
  echo "Rolled back."; exit 0
fi
npx tsc --noEmit -p .
npm run build
rm -f /tmp/filashift-site.zip; (cd dist/public && zip -qr /tmp/filashift-site.zip .)
scp -i "$KEY" -q /tmp/filashift-site.zip "$HOST":/tmp/site.zip
$SSH "$HOST" 'set -e; cd /var/www; rm -rf plateshift.new; mkdir plateshift.new; unzip -q /tmp/site.zip -d plateshift.new; chown -R caddy:caddy plateshift.new; rm -rf plateshift.old; mv plateshift plateshift.old; mv plateshift.new plateshift; echo "release $(git -C /srv/git/filashift.git rev-parse --short master 2>/dev/null) $(date -u +%FT%TZ)" >> /var/log/filashift-releases.log'
for u in https://filashift.com/ https://filashift.com/profiles/index.json https://filashift.com/fonts/fonts.css; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$u"); echo "$u $c"; [[ $c == 200 ]] || { echo "CHECK FAILED - run --rollback"; exit 1; }
done
echo "Released."
