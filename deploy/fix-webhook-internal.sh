#!/usr/bin/env bash
# Webhook interno (Docker→API) + poller de respaldo
set -euo pipefail
APP=/var/www/camsoft-crm
cd "$APP"

WEBHOOK_INTERNAL="http://host.docker.internal:3847/webhooks/whatsapp"
GATEWAY=$(docker network inspect camsoft-crm_default -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null || echo "172.17.0.1")
WEBHOOK_GATEWAY="http://${GATEWAY}:3847/webhooks/whatsapp"

echo "==> Código"
git fetch origin main
git reset --hard origin/main

echo ""
echo "==> .env webhook INTERNO (no HTTPS desde Docker)"
ENV_FILE="$APP/.env"
if grep -q '^CAMSOFT_WEBHOOK_URL=' "$ENV_FILE"; then
    sed -i "s|^CAMSOFT_WEBHOOK_URL=.*|CAMSOFT_WEBHOOK_URL=${WEBHOOK_INTERNAL}|" "$ENV_FILE"
else
    echo "CAMSOFT_WEBHOOK_URL=${WEBHOOK_INTERNAL}" >> "$ENV_FILE"
fi
grep CAMSOFT_WEBHOOK_URL "$ENV_FILE"

echo ""
echo "==> Recrear Evolution"
docker compose up -d evolution-api --force-recreate
sleep 15

APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)

echo ""
echo "==> Configurar webhook instancia (URL interna)"
for URL in "$WEBHOOK_INTERNAL" "$WEBHOOK_GATEWAY"; do
    echo "Probando URL: $URL"
    RES=$(curl -s -w "\n%{http_code}" -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
        "http://127.0.0.1:8080/webhook/set/camsoft" \
        -d "{\"webhook\":{\"enabled\":true,\"url\":\"${URL}\",\"events\":[\"MESSAGES_UPSERT\"]}}")
    CODE=$(echo "$RES" | tail -1)
    if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
        echo "OK webhook → $URL"
        sed -i "s|^CAMSOFT_WEBHOOK_URL=.*|CAMSOFT_WEBHOOK_URL=${URL}|" "$ENV_FILE"
        break
    fi
    echo "HTTP $CODE — probando siguiente..."
done

echo ""
curl -sf -H "apikey: ${APIKEY}" "http://127.0.0.1:8080/webhook/find/camsoft" || true
echo ""

echo ""
echo "==> Reiniciar API (activa poller de respaldo)"
cd "$APP/api"
npm install --omit=dev 2>/dev/null || true
systemctl restart camsoft-crm
sleep 4
curl -sf http://127.0.0.1:3847/health && echo ""

echo ""
echo "============================================"
echo "IMPORTANTE — en Evolution Manager (wa.camsoft.com.co):"
echo "  URL del webhook debe ser:"
echo "  ${WEBHOOK_INTERNAL}"
echo "  (NO https://api.camsoft.com.co — Docker no llega bien)"
echo "  MESSAGES_UPSERT = ON → clic en Guardar"
echo ""
echo "Prueba: escribe 'hola' por WhatsApp y ejecuta:"
echo "  journalctl -u camsoft-crm -f | grep -E 'webhook|poller|enviado'"
echo "============================================"
