#!/usr/bin/env bash
# Ejecutar EN EL DROPLET como root o con sudo:
#   bash /var/www/camsoft-crm/deploy/install.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/camsoft-crm}"
cd "$APP_DIR"

echo "==> Dependencias del sistema"
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-plugin nginx certbot python3-certbot-nginx nodejs npm || true

echo "==> Docker Compose (PostgreSQL, Evolution, n8n)"
if [ ! -f .env ]; then
    echo "ERROR: Crea $APP_DIR/.env desde .env.example antes de instalar."
    exit 1
fi
docker compose up -d

echo "==> API Node"
cd "$APP_DIR/api"
npm install --omit=dev

echo "==> Admin React"
cd "$APP_DIR/admin"
npm install
npm run build

echo "==> Nginx sites"
for f in api crm wa n8n; do
    cp "$APP_DIR/deploy/nginx/${f}.camsoft.com.co.conf" "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
    ln -sf "/etc/nginx/sites-available/${f}.camsoft.com.co.conf" "/etc/nginx/sites-enabled/"
done
nginx -t && systemctl reload nginx

echo "==> systemd API"
cp "$APP_DIR/deploy/camsoft-crm.service" /etc/systemd/system/camsoft-crm.service
systemctl daemon-reload
systemctl enable camsoft-crm
systemctl restart camsoft-crm

echo ""
echo "Listo. Siguiente:"
echo "  1. DNS A records: api, crm, wa, n8n -> IP del droplet"
echo "  2. certbot --nginx -d api.camsoft.com.co -d crm.camsoft.com.co -d wa.camsoft.com.co -d n8n.camsoft.com.co"
echo "  3. Abre https://crm.camsoft.com.co y conecta WhatsApp en pestaña WA"
echo "  4. Agrega widget en index.html de camsoft.com.co"
