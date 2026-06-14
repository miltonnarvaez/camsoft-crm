#!/usr/bin/env bash
# Apaga TODOS los webhooks (global Docker + instancia) — usar antes de escanear QR
set -euo pipefail
cd /var/www/camsoft-crm

echo "=== 1. Webhook global OFF en docker-compose ==="
if grep -q 'WEBHOOK_GLOBAL_ENABLED' docker-compose.yml; then
    sed -i 's/WEBHOOK_GLOBAL_ENABLED: "true"/WEBHOOK_GLOBAL_ENABLED: "false"/' docker-compose.yml
else
    sed -i '/WEBHOOK_GLOBAL_URL:/a\      WEBHOOK_GLOBAL_ENABLED: "false"' docker-compose.yml
fi
grep WEBHOOK_GLOBAL docker-compose.yml

echo ""
echo "=== 2. .env (no usar URL mientras reconectas) ==="
sed -i 's|^CAMSOFT_WEBHOOK_URL=.*|CAMSOFT_WEBHOOK_URL=http://127.0.0.1:9/disabled|' .env

echo ""
echo "=== 3. Recrear Evolution sin webhook global ==="
docker compose up -d evolution-api --force-recreate
echo "Esperando 25s..."
sleep 25

APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)

echo ""
echo "=== 4. Webhook instancia OFF ==="
curl -sf -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
    "http://127.0.0.1:8080/webhook/set/camsoft" \
    -d '{"webhook":{"enabled":false,"url":"http://127.0.0.1:9/disabled","events":[]}}' \
    && echo "Instancia camsoft: webhook OFF" || echo "(instancia camsoft no existe aún — OK)"

echo ""
echo "=== 5. Logs (no debe haber más timeout 60s) ==="
docker compose logs evolution-api --tail 5
echo ""
echo "LISTO. Ahora ejecuta: bash deploy/reconectar-whatsapp.sh"
echo "O crea instancia y escanea QR en Manager."
