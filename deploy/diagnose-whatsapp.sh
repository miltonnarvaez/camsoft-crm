#!/usr/bin/env bash
# Diagnóstico: por qué no llegan mensajes al teléfono del cliente
set -euo pipefail
APP=/var/www/camsoft-crm
cd "$APP"

APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)
WEBHOOK_URL="http://host.docker.internal:3847/webhooks/whatsapp"

echo "============================================"
echo "DIAGNÓSTICO WHATSAPP — CamSoft CRM"
echo "============================================"

echo ""
echo "==> 1. Contenedores"
docker compose ps evolution-api postgres 2>/dev/null || true

echo ""
echo "==> 2. Evolution accesible"
if curl -sf -H "apikey: ${APIKEY}" http://127.0.0.1:8080/instance/fetchInstances >/dev/null; then
    echo "OK: Evolution responde en :8080"
else
    echo "FALLO: Evolution no responde. Ejecuta: docker compose up -d evolution-api && sleep 20"
    exit 1
fi

echo ""
echo "==> 3. Estado conexión WhatsApp"
STATE_JSON=$(curl -sf -H "apikey: ${APIKEY}" http://127.0.0.1:8080/instance/connectionState/camsoft || echo '{}')
echo "$STATE_JSON"
if echo "$STATE_JSON" | grep -qiE '"state":"open"|"state":"connected"'; then
    echo "OK: WhatsApp CONECTADO"
else
    echo "FALLO: WhatsApp DESCONECTADO → crm.camsoft.com.co → pestaña WA → escanear QR"
fi

echo ""
echo "==> 4. API Node"
curl -sf http://127.0.0.1:3847/health && echo "" || echo "FALLO: API no responde en :3847"

echo ""
echo "==> 5. Webhook instancia"
curl -sf -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
    "http://127.0.0.1:8080/webhook/set/camsoft" \
    -d "{\"enabled\":true,\"url\":\"${WEBHOOK_URL}\",\"webhookByEvents\":false,\"webhookBase64\":false,\"events\":[\"MESSAGES_UPSERT\"]}" \
    && echo "OK: webhook configurado → ${WEBHOOK_URL}" || echo "FALLO: no se pudo configurar webhook"

echo ""
echo "==> 6. Últimos contactos WhatsApp en BD"
docker compose exec -T postgres psql -U camsoft -d camsoft_crm -c \
    "SELECT name, phone, external_id FROM contacts WHERE source='whatsapp' ORDER BY updated_at DESC LIMIT 5;" 2>/dev/null || true

echo ""
echo "==> 7. Últimos errores de envío (API)"
journalctl -u camsoft-crm -n 40 --no-pager 2>/dev/null | grep -iE 'whatsapp|webhook' | tail -15 || true

echo ""
echo "==> 8. Prueba de envío (opcional)"
if [ -n "${TEST_PHONE:-}" ]; then
    echo "Enviando mensaje de prueba a ${TEST_PHONE}..."
    curl -s -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
        "http://127.0.0.1:8080/message/sendText/camsoft" \
        -d "{\"number\":\"${TEST_PHONE}\",\"text\":\"Prueba CamSoft CRM $(date +%H:%M)\"}" | head -c 400
    echo ""
else
    echo "(Omitido) Para probar envío directo, ejecuta:"
    echo "  TEST_PHONE=573XXXXXXXXX bash deploy/diagnose-whatsapp.sh"
fi

echo ""
echo "============================================"
echo "PRUEBA REAL:"
echo "  1. Desde OTRO celular escribe 'hola' al WhatsApp de negocio"
echo "  2. Debe responder el bot en 5-10 segundos"
echo "  3. NO uses grupos de WhatsApp"
echo "============================================"
