#!/usr/bin/env bash
# Recuperar TODO: Docker, API, Nginx SSL, Evolution
set -euo pipefail
cd /var/www/camsoft-crm

echo "==> Git pull"
git pull origin main

echo "==> Docker (PostgreSQL, Evolution, Redis, n8n)"
docker compose up -d
sleep 8

echo "==> Permisos .env para API"
chmod 640 .env 2>/dev/null || true
chown root:www-data .env 2>/dev/null || true

echo "==> API Node"
cd /var/www/camsoft-crm/api
npm install --omit=dev 2>/dev/null || true
systemctl daemon-reload
systemctl enable camsoft-crm
systemctl restart camsoft-crm
sleep 3

echo "==> Test API local"
curl -sf http://127.0.0.1:3847/health || {
    echo "ERROR: API no responde. Logs:"
    journalctl -u camsoft-crm -n 25 --no-pager
    exit 1
}
echo ""

echo "==> Admin build"
cd /var/www/camsoft-crm/admin
npm install 2>/dev/null || true
npm run build

echo "==> Nginx (SSL completo)"
for f in api crm wa n8n; do
    cp "/var/www/camsoft-crm/deploy/nginx/${f}.camsoft.com.co.conf" \
       "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
    ln -sf "/etc/nginx/sites-available/${f}.camsoft.com.co.conf" \
           "/etc/nginx/sites-enabled/${f}.camsoft.com.co.conf"
done
nginx -t
systemctl reload nginx

echo "==> Test Evolution local"
curl -sf -o /dev/null -w "Evolution HTTP %{http_code}\n" http://127.0.0.1:8080/ || echo "Evolution: revisar docker compose logs evolution-api"

echo ""
echo "============================================"
echo "LISTO. Prueba:"
echo "  https://crm.camsoft.com.co  (login CRM)"
echo "  https://api.camsoft.com.co/health"
echo "  https://wa.camsoft.com.co/manager"
echo "============================================"
