#!/usr/bin/env bash
# Corrige respuestas duplicadas del bot WhatsApp
set -euo pipefail
cd /var/www/camsoft-crm

APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)

echo "=== 1. Webhook instancia OFF (solo global Docker) ==="
curl -sf -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
  "http://127.0.0.1:8080/webhook/set/camsoft" \
  -d '{"webhook":{"enabled":false,"url":"","events":[]}}' \
  && echo "OK" || echo "(instancia no existe — OK)"

echo ""
echo "=== 2. Poller OFF + webhook global ON en .env ==="
grep -q '^WHATSAPP_POLLER=' .env && \
  sed -i 's/^WHATSAPP_POLLER=.*/WHATSAPP_POLLER=false/' .env || \
  echo 'WHATSAPP_POLLER=false' >> .env

grep -q '^EVOLUTION_USE_GLOBAL_WEBHOOK=' .env && \
  sed -i 's/^EVOLUTION_USE_GLOBAL_WEBHOOK=.*/EVOLUTION_USE_GLOBAL_WEBHOOK=true/' .env || \
  echo 'EVOLUTION_USE_GLOBAL_WEBHOOK=true' >> .env

echo ""
echo "=== 3. Código actualizado (dedupe @lid + doble webhook) ==="
git pull origin main 2>/dev/null || true

echo ""
echo "=== 4. Reiniciar API ==="
systemctl restart camsoft-crm
sleep 3

echo ""
echo "=== 5. Verificar (no debe decir 'poller activo') ==="
journalctl -u camsoft-crm -n 8 --no-pager | grep -E 'poller|webhook instancia|API en puerto' || true

echo ""
echo "============================================"
echo "Prueba: escribe HOLA una vez desde 3173742174"
echo "Debe llegar UNA sola bienvenida."
echo ""
echo "Si siguen dos, revisa logs:"
echo "  journalctl -u camsoft-crm -f"
echo "  (busca 'duplicado ignorado' o dos 'procesados: 1')"
echo "============================================"
