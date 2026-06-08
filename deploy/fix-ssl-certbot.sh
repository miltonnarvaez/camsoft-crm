#!/usr/bin/env bash
# SSL faltante en crm/api/wa/n8n — arreglo en 2 pasos
set -euo pipefail
APP=/var/www/camsoft-crm
cd "$APP"
git pull origin main 2>/dev/null || true

echo "==> Certificados existentes:"
ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "(ninguno)"

echo ""
echo "==> Paso 1: Nginx HTTP (sin SSL) para que arranque"
for f in api crm wa n8n; do
    cp "$APP/deploy/nginx/http/${f}.camsoft.com.co.conf" \
       "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
    ln -sf "/etc/nginx/sites-available/${f}.camsoft.com.co.conf" \
           "/etc/nginx/sites-enabled/${f}.camsoft.com.co.conf"
done

nginx -t
systemctl reload nginx
echo "Nginx HTTP OK"

echo ""
echo "==> Docker + API"
docker compose up -d
systemctl restart camsoft-crm
sleep 3
curl -sf http://127.0.0.1:3847/health && echo ""

echo ""
echo "==> Paso 2: Crear certificados SSL con certbot"
certbot --nginx \
    -d api.camsoft.com.co \
    -d crm.camsoft.com.co \
    -d wa.camsoft.com.co \
    -d n8n.camsoft.com.co \
    --non-interactive --agree-tos -m nf_alejo@yahoo.com \
    || {
    echo ""
    echo "Si certbot falló, ejecuta manualmente:"
    echo "  certbot --nginx -d api.camsoft.com.co -d crm.camsoft.com.co -d wa.camsoft.com.co -d n8n.camsoft.com.co"
    echo ""
    echo "Mientras tanto prueba HTTP:"
    echo "  http://api.camsoft.com.co/health"
    exit 0
    }

echo ""
echo "==> Paso 3: Configs SSL finales"
for f in api crm wa n8n; do
    cp "$APP/deploy/nginx/${f}.camsoft.com.co.conf" \
       "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
done
nginx -t && systemctl reload nginx

echo ""
echo "LISTO:"
echo "  https://api.camsoft.com.co/health"
echo "  https://crm.camsoft.com.co"
echo "  https://wa.camsoft.com.co/manager"
