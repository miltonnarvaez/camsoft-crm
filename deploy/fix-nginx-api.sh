#!/usr/bin/env bash
# Corrige api.camsoft.com.co que muestra la web en vez de la API
set -euo pipefail

APP=/var/www/camsoft-crm
cd "$APP"
git pull origin main 2>/dev/null || true

echo "==> Configs nginx que mencionan api.camsoft.com.co:"
grep -rl "api.camsoft.com.co" /etc/nginx/ 2>/dev/null || true

echo ""
echo "==> Levantar Docker + API"
docker compose up -d
sleep 8
chmod 640 "$APP/.env" 2>/dev/null || true
chown root:www-data "$APP/.env" 2>/dev/null || true
systemctl restart camsoft-crm
sleep 3

echo "Test API local:"
curl -sf http://127.0.0.1:3847/health
echo ""

echo ""
echo "==> Instalar configs nginx correctos"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

for f in api crm wa n8n; do
    cp "$APP/deploy/nginx/${f}.camsoft.com.co.conf" \
       "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
    ln -sf "/etc/nginx/sites-available/${f}.camsoft.com.co.conf" \
           "/etc/nginx/sites-enabled/${f}.camsoft.com.co.conf"
done

echo ""
echo "Verificar api.camsoft.com.co usa proxy 3847:"
grep -A2 "server_name api" /etc/nginx/sites-enabled/api.camsoft.com.co.conf
grep "proxy_pass" /etc/nginx/sites-enabled/api.camsoft.com.co.conf

if ! nginx -t 2>&1; then
    echo ""
    echo "SSL roto. Ejecuta:"
    echo "  certbot --nginx -d api.camsoft.com.co -d crm.camsoft.com.co -d wa.camsoft.com.co -d n8n.camsoft.com.co"
    exit 1
fi

systemctl reload nginx

echo ""
echo "==> Test publico API (debe ser JSON, NO la web Milton):"
curl -sf https://api.camsoft.com.co/health && echo "" || echo "FALLO https publico"

echo ""
echo "==> Evolution"
docker compose up -d evolution-api
sleep 5
curl -sf -o /dev/null -w "wa/manager via local 8080: HTTP %{http_code}\n" http://127.0.0.1:8080/manager || true

echo ""
echo "LISTO. api.camsoft.com.co/health debe mostrar JSON."
echo "crm.camsoft.com.co debe hacer login sin Failed to fetch."
