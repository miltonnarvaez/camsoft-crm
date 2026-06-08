#!/usr/bin/env bash
# Recupera API caída (502) + textos del bot / saludo
set -euo pipefail

APP=/var/www/camsoft-crm
cd "$APP"

echo "========== 1. Actualizar código =========="
git pull origin main

echo ""
echo "========== 2. Docker (postgres, evolution…) =========="
docker compose up -d
sleep 5

echo ""
echo "========== 3. Migración SQL (tablas + FAQs) =========="
docker compose exec -T postgres psql -U camsoft -d camsoft_crm \
    < "$APP/migrations/001_init.sql" 2>&1 | tail -5 || true

echo ""
echo "========== 4. Nginx HTTP (si SSL falla) =========="
if ! nginx -t 2>/dev/null; then
    echo "SSL roto — usando configs HTTP temporales"
    for f in api crm wa n8n; do
        cp "$APP/deploy/nginx/http/${f}.camsoft.com.co.conf" \
           "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
        ln -sf "/etc/nginx/sites-available/${f}.camsoft.com.co.conf" \
               "/etc/nginx/sites-enabled/${f}.camsoft.com.co.conf"
    done
    nginx -t && systemctl reload nginx
else
    systemctl reload nginx
fi

echo ""
echo "========== 5. Reiniciar API Node =========="
cd "$APP/api"
npm install --omit=dev 2>/dev/null || true
systemctl daemon-reload
systemctl restart camsoft-crm
sleep 4

echo ""
echo "========== 6. Probar API local =========="
if curl -sf http://127.0.0.1:3847/health; then
    echo ""
    echo "OK: API responde"
else
    echo "FALLO — últimos logs:"
    journalctl -u camsoft-crm -n 25 --no-pager
    exit 1
fi

echo ""
echo "========== 7. Probar saludo del bot =========="
BOT=$(curl -sf -X POST http://127.0.0.1:3847/chat/start \
    -H "Content-Type: application/json" \
    -d '{"name":"Prueba"}')
if echo "$BOT" | grep -q "asistente de CamSoft"; then
    echo "OK: saludo del bot presente"
else
    echo "Respuesta chat/start:"
    echo "$BOT" | head -c 600
    echo ""
fi

echo ""
echo "========== 8. Probar URL pública =========="
curl -sf https://api.camsoft.com.co/health && echo "" || \
curl -sf http://api.camsoft.com.co/health && echo "" || \
echo "(público aún falla — revisa nginx / certbot)"

echo ""
echo "============================================"
echo "LISTO. Escribe 'hola' en WhatsApp o chat web."
echo "  https://api.camsoft.com.co/health"
echo "  https://crm.camsoft.com.co"
echo "============================================"
