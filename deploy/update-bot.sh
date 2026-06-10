#!/usr/bin/env bash
# Actualiza bot robusto: migración + contenido + panel CRM
set -euo pipefail
APP=/var/www/camsoft-crm
cd "$APP"

echo "==> Código"
git fetch origin main
git reset --hard origin/main

echo ""
echo "==> Migración bot (keywords, sector, tipos)"
docker compose exec -T postgres psql -U camsoft -d camsoft_crm \
    < "$APP/migrations/002_bot_keywords.sql" 2>&1 | tail -3 || true

echo ""
echo "==> Cargar contenido robusto del bot"
cd "$APP/api"
node -e "
require('dotenv').config({ path: '../.env' });
const { seedBotContent } = require('./src/bot');
seedBotContent(true).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
"

echo ""
echo "==> API"
npm install --omit=dev 2>/dev/null || true
systemctl restart camsoft-crm
sleep 3
curl -sf http://127.0.0.1:3847/health && echo ""

echo ""
echo "==> Admin CRM (pestaña Bot)"
cd "$APP/admin"
npm install 2>/dev/null || true
npm run build

echo ""
echo "============================================"
echo "LISTO:"
echo "  https://crm.camsoft.com.co → pestaña BOT"
echo "  Prueba WhatsApp: hola → Sector educación → LMS"
echo "============================================"
