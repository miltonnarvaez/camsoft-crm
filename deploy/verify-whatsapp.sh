#!/usr/bin/env bash
# Verificar WhatsApp / Evolution + reiniciar API
set -euo pipefail
cd /var/www/camsoft-crm

git pull origin main

chmod 640 .env 2>/dev/null || true
chown root:www-data .env 2>/dev/null || true

echo "==> Contenedores"
docker compose ps

echo ""
echo "==> Esperar Evolution (migraciones)..."
APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)
for i in $(seq 1 40); do
    if curl -sf -H "apikey: ${APIKEY}" http://127.0.0.1:8080/instance/fetchInstances >/dev/null 2>&1; then
        echo "Evolution OK en intento $i"
        break
    fi
    echo "  esperando... ($i/40)"
    sleep 3
done

echo ""
echo "==> Test Evolution"
curl -s -H "apikey: ${APIKEY}" http://127.0.0.1:8080/instance/fetchInstances | head -c 300
echo ""

echo ""
echo "==> Logs Evolution"
docker compose logs evolution-api --tail 15

echo ""
echo "==> API Node"
systemctl restart camsoft-crm
sleep 2
curl -s http://127.0.0.1:3847/health
echo ""

echo ""
echo "==> Nginx api timeout"
cp deploy/nginx/api.camsoft.com.co.conf /etc/nginx/sites-available/api.camsoft.com.co.conf
nginx -t && systemctl reload nginx

cd admin && npm run build 2>/dev/null || true

echo ""
echo "Prueba: CRM -> WA -> Regenerar QR"
echo "O: https://wa.camsoft.com.co/manager (API Key arriba en .env)"
