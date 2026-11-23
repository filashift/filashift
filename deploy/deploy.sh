#!/usr/bin/env bash
# Usage: ./deploy/deploy.sh user@your-server
# Builds the site and uploads it to /var/www/plateshift on the server.
set -euo pipefail
HOST="${1:?usage: deploy.sh user@server}"
cd "$(dirname "$0")/.."
npm ci && npm run build
rsync -avz --delete dist/public/ "$HOST":/var/www/plateshift/
echo "Uploaded. Visit your domain to check it."
