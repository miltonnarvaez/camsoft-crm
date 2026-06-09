#!/usr/bin/env bash
# Activa eventos MESSAGES_UPSERT en Evolution + URL pública del webhook
set -euo pipefail
APP=/var/www/camsoft-crm
cd "$APP"

echo "==> Actualizar código"
git checkout -- deploy/ 2>/dev/null || true
git pull origin main

echo ""
echo "==> .env webhook URL pública"
ENV_FILE="$APP/.env"
if grep -q '^CAMSOFT_WEBHOOK_URL=' "$ENV_FILE"; then
    sed -i 's|^CAMSOFT_WEBHOOK_URL=.*|CAMSOFT_WEBHOOK_URL=https://api.camsoft.com.co/webhooks/whatsapp|' "$ENV_FILE"
else
    echo 'CAMSOFT_WEBHOOK_URL=https://api.camsoft.com.co/webhooks/whatsapp' >> "$ENV_FILE"
fi
grep CAMSOFT_WEBHOOK_URL "$ENV_FILE"

echo ""
echo "==> Recrear Evolution (aplica WEBHOOK_EVENTS_MESSAGES_UPSERT)"
docker compose up -d evolution-api --force-recreate
sleep 15

APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)

echo ""
echo "==> Webhook instancia"
curl -sf -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
    "http://127.0.0.1:8080/webhook/set/camsoft" \
    -d '{"webhook":{"enabled":true,"url":"https://api.camsoft.com.co/webhooks/whatsapp","events":["MESSAGES_UPSERT"]}}' \
    && echo "OK instancia" || echo "FALLO instancia"

echo ""
echo "==> Webhook find"
curl -sf -H "apikey: ${APIKEY}" "http://127.0.0.1:8080/webhook/find/camsoft" || true
echo ""

echo ""
echo "==> Evolution → API (desde contenedor)"
docker compose exec -T evolution-api wget -qO- http://host.docker.internal:3847/health 2>/dev/null && echo "" || \
    echo "host.docker.internal no responde (usamos URL pública)"

echo ""
echo "==> Probar webhook público"
curl -sf -X POST https://api.camsoft.com.co/webhooks/whatsapp \
    -H "Content-Type: application/json" \
    -d '{"event":"messages.upsert","instance":"camsoft","data":{"key":{"remoteJid":"573166352171@s.whatsapp.net","fromMe":false,"id":"test-webhook"},"message":{"conversation":"test webhook"},"pushName":"Test"}}' \
    && echo "OK webhook público"

echo ""
echo "==> Reiniciar API (ver logs)"
systemctl restart camsoft-crm
sleep 3

echo ""
echo "============================================"
echo "LISTO. Escribe 'hola' por WhatsApp y luego:"
echo "  journalctl -u camsoft-crm -n 10 --no-pager | grep webhook"
echo "Debes ver: [webhook whatsapp] recibido: messages.upsert"
echo "============================================"
