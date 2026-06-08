#!/usr/bin/env bash
# Desde tu PC (con clave SSH configurada):
#   DROPLET_USER=root DROPLET_HOST=TU_IP bash deploy/sync-to-droplet.sh

set -euo pipefail

USER_HOST="${DROPLET_USER:-root}@${DROPLET_HOST:?define DROPLET_HOST}"
REMOTE_DIR="/var/www/camsoft-crm"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

rsync -avz --delete \
  --exclude node_modules \
  --exclude admin/dist \
  --exclude .env \
  "$ROOT/" "$USER_HOST:$REMOTE_DIR/"

echo "Sincronizado. En el droplet:"
echo "  ssh $USER_HOST 'cd $REMOTE_DIR && bash deploy/install.sh'"
