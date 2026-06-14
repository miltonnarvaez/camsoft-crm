#!/usr/bin/env bash
# Arreglo urgente: bot siempre responde con texto (sin botones rotos)
set -euo pipefail
cd /var/www/camsoft-crm
git pull origin main

grep -q '^WHATSAPP_INTERACTIVE=' .env && \
  sed -i 's/^WHATSAPP_INTERACTIVE=.*/WHATSAPP_INTERACTIVE=false/' .env || \
  echo 'WHATSAPP_INTERACTIVE=false' >> .env

systemctl restart camsoft-crm
sleep 2
curl -sf http://127.0.0.1:3847/health && echo " API OK" || echo " API NO responde"

echo ""
echo "Prueba: escribe HOLA al WhatsApp del negocio"
echo "Debe responder con menú 1 / 2"
