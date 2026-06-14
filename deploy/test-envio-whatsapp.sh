#!/usr/bin/env bash
# Prueba si Evolution puede enviar al celular del tester
set -euo pipefail
cd /var/www/camsoft-crm
PHONE="${1:-573173742174}"
APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)

echo "Enviando a ${PHONE} y ${PHONE}@s.whatsapp.net ..."
for NUM in "${PHONE}@s.whatsapp.net" "${PHONE}"; do
    echo "--- $NUM ---"
    curl -s -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
        "http://127.0.0.1:8080/message/sendText/camsoft" \
        -d "{\"number\":\"${NUM}\",\"text\":\"Prueba CamSoft $(date +%H:%M) — responde si llegó\"}"
    echo ""
    sleep 2
done
echo "¿Llegó alguno a tu WhatsApp?"
