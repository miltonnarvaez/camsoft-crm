#!/usr/bin/env bash
# Actualiza bot: menús interactivos + keywords + contenido FAQ en BD
set -euo pipefail
cd /var/www/camsoft-crm

git pull origin main

node - <<'NODE'
require('dotenv').config();
const { seedBotContent } = require('./api/src/bot');
seedBotContent(true).then(() => {
  console.log('[deploy] bot FAQs actualizados');
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
NODE

grep -q '^WHATSAPP_INTERACTIVE=' .env && \
  sed -i 's/^WHATSAPP_INTERACTIVE=.*/WHATSAPP_INTERACTIVE=true/' .env || \
  echo 'WHATSAPP_INTERACTIVE=true' >> .env

systemctl restart camsoft-crm
echo "Listo. Prueba: hola → menú con opciones · 2 → ventas · pagina web de concejo"
