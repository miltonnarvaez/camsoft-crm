#!/usr/bin/env bash
# Después de escanear QR: webhook + prueba de envío
set -euo pipefail
cd /var/www/camsoft-crm

APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)
WEBHOOK="https://api.camsoft.com.co/webhooks/whatsapp"
TEST_PHONE="${1:-573173742174}"

echo "=== Estado conexión ==="
curl -sf -H "apikey: ${APIKEY}" http://127.0.0.1:8080/instance/connectionState/camsoft
echo ""

echo ""
echo "=== Activar webhook ==="
sed -i "s|^CAMSOFT_WEBHOOK_URL=.*|CAMSOFT_WEBHOOK_URL=${WEBHOOK}|" .env
sed -i 's/WEBHOOK_GLOBAL_ENABLED: "false"/WEBHOOK_GLOBAL_ENABLED: "true"/' docker-compose.yml

curl -sf -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
  "http://127.0.0.1:8080/webhook/set/camsoft" \
  -d '{"webhook":{"enabled":false,"url":"","events":[]}}'

echo "Webhook instancia OFF (solo global Docker → ${WEBHOOK})"

docker compose up -d evolution-api --force-recreate
sleep 15
systemctl restart camsoft-crm
sleep 2

echo ""
echo "=== Prueba envío a ${TEST_PHONE} ==="
curl -s -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
  "http://127.0.0.1:8080/message/sendText/camsoft" \
  -d "{\"number\":\"${TEST_PHONE}@s.whatsapp.net\",\"text\":\"Prueba chip CamSoft $(date +%H:%M)\"}"
echo ""

echo ""
echo "============================================"
echo "¿Llegó el mensaje al celular ${TEST_PHONE}?"
echo "  SÍ  → escribe HOLA y el bot debe responder"
echo "  NO  → WhatsApp puede bloquear envíos Baileys; revisar Manager o API oficial Meta"
echo "============================================"
