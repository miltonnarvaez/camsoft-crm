#!/usr/bin/env bash
# Reparar Evolution API (QR WhatsApp)
set -euo pipefail
cd /var/www/camsoft-crm

git pull origin main

# Schema que Evolution v2 espera
docker compose exec -T postgres psql -U camsoft -d camsoft_crm -c "CREATE SCHEMA IF NOT EXISTS evolution_api;" 2>/dev/null || \
  docker compose exec -T postgres psql -U "${POSTGRES_USER:-camsoft}" -d camsoft_crm -c "CREATE SCHEMA IF NOT EXISTS evolution_api;" || true

echo "==> Recrear contenedor Evolution (nueva imagen + volumen)"
docker compose stop evolution-api || true
docker compose rm -f evolution-api || true
docker compose pull evolution-api
docker compose up -d evolution-api redis postgres

echo "Esperando Evolution..."
for i in $(seq 1 30); do
    if curl -sf -H "apikey: $(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2)" http://127.0.0.1:8080/ >/dev/null 2>&1; then
        echo "Evolution respondiendo."
        break
    fi
    sleep 2
done

echo ""
echo "==> Logs Evolution (ultimas 25 lineas)"
docker compose logs evolution-api --tail 25

echo ""
echo "==> Probar crear instancia camsoft"
APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)
curl -s -X POST http://127.0.0.1:8080/instance/create \
  -H "apikey: ${APIKEY}" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"camsoft","integration":"WHATSAPP-BAILEYS","qrcode":true}' | head -c 500
echo ""

systemctl restart camsoft-crm
cd admin && npm install && npm run build

echo ""
echo "=== OPCION B: Manager web ==="
echo "Abre https://wa.camsoft.com.co/manager"
echo "API Key (de .env EVOLUTION_API_KEY):"
grep ^EVOLUTION_API_KEY= .env
echo ""
echo "Luego en CRM -> WA -> Regenerar QR"
