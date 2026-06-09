#!/usr/bin/env bash
# Arregla envío de mensajes WhatsApp (bot + respuestas desde CRM)
set -euo pipefail
APP=/var/www/camsoft-crm
cd "$APP"

echo "========== 1. Código =========="
git checkout -- deploy/ 2>/dev/null || true
git pull origin main

echo ""
echo "========== 2. Evolution API =========="
docker compose up -d evolution-api postgres redis
sleep 8
docker compose ps evolution-api

APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)
for i in $(seq 1 20); do
    if curl -sf -H "apikey: ${APIKEY}" http://127.0.0.1:8080/instance/fetchInstances >/dev/null 2>&1; then
        echo "Evolution OK (intento $i)"
        break
    fi
    echo "  esperando Evolution... ($i/20)"
    sleep 3
done

STATE=$(curl -sf -H "apikey: ${APIKEY}" \
    "http://127.0.0.1:8080/instance/connectionState/camsoft" | grep -o '"state":"[^"]*"' | head -1 || true)
echo "Estado WhatsApp: ${STATE:-desconocido}"

echo ""
echo "========== 3. Webhook interno =========="
if grep -q '^CAMSOFT_WEBHOOK_URL=' .env; then
    sed -i 's|^CAMSOFT_WEBHOOK_URL=.*|CAMSOFT_WEBHOOK_URL=http://host.docker.internal:3847/webhooks/whatsapp|' .env
else
    echo 'CAMSOFT_WEBHOOK_URL=http://host.docker.internal:3847/webhooks/whatsapp' >> .env
fi

echo ""
echo "========== 4. Reiniciar API =========="
cd "$APP/api"
npm install --omit=dev 2>/dev/null || true
systemctl restart camsoft-crm
sleep 4
curl -sf http://127.0.0.1:3847/health && echo ""

echo ""
echo "========== 5. Webhook en instancia camsoft =========="
curl -sf -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
    "http://127.0.0.1:8080/webhook/set/camsoft" \
    -d '{"enabled":true,"url":"http://host.docker.internal:3847/webhooks/whatsapp","webhookByEvents":false,"webhookBase64":false,"events":["MESSAGES_UPSERT"]}' \
    && echo "webhook instancia OK" || echo "webhook instancia FALLO"

echo ""
echo "========== 6. Reiniciar Evolution =========="
docker compose restart evolution-api
sleep 10

echo ""
echo "========== 7. Diagnóstico =========="
chmod +x "$APP/deploy/diagnose-whatsapp.sh"
bash "$APP/deploy/diagnose-whatsapp.sh" || true
