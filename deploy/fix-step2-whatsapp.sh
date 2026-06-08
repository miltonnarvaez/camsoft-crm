#!/usr/bin/env bash
# Paso 2: WhatsApp QR — actualizar API/admin y reiniciar Evolution
set -euo pipefail
cd /var/www/camsoft-crm

git pull origin main

echo "==> Evolution API estado"
docker compose ps evolution-api
docker compose logs evolution-api --tail 20 || true

echo "==> Reiniciar Evolution"
docker compose restart evolution-api
sleep 5

echo "==> Rebuild admin + reiniciar API"
cd admin && npm install && npm run build
cd ..
systemctl restart camsoft-crm

echo ""
echo "Prueba en CRM -> WA -> Regenerar QR"
echo "Si falla, ejecuta:"
echo "  docker compose logs evolution-api --tail 50"
