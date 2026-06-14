#!/usr/bin/env bash
# Actualiza bot: menús interactivos + keywords + contenido FAQ en BD
set -euo pipefail
cd /var/www/camsoft-crm

git pull origin main 2>/dev/null || true

echo "==> Actualizar FAQs del bot en BD"
cd /var/www/camsoft-crm/api
node -e "
require('dotenv').config({ path: '../.env' });
const { seedBotContent } = require('./src/bot');
seedBotContent(true).then(() => {
  console.log('[deploy] bot FAQs actualizados');
  process.exit(0);
}).catch((e) => { console.error(e); process.exit(1); });
"

grep -q '^BOT_FORCE_SEED=' /var/www/camsoft-crm/.env && \
  sed -i 's/^BOT_FORCE_SEED=.*/BOT_FORCE_SEED=true/' /var/www/camsoft-crm/.env || \
  echo 'BOT_FORCE_SEED=true' >> /var/www/camsoft-crm/.env

grep -q '^WHATSAPP_INTERACTIVE=' /var/www/camsoft-crm/.env && \
  sed -i 's/^WHATSAPP_INTERACTIVE=.*/WHATSAPP_INTERACTIVE=false/' /var/www/camsoft-crm/.env || \
  echo 'WHATSAPP_INTERACTIVE=false' >> /var/www/camsoft-crm/.env

systemctl restart camsoft-crm
sleep 2
echo ""
echo "============================================"
echo "LISTO. Prueba WhatsApp:"
echo "  hola → menú con opciones"
echo "  2 → ventas"
echo "  pagina web de concejo → sector público"
echo "============================================"
