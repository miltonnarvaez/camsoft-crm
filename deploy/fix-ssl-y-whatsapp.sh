#!/usr/bin/env bash
# SSL por subdominio (ERR_CERT_COMMON_NAME_INVALID) + webhook WhatsApp + respuestas automáticas
set -euo pipefail

APP=/var/www/camsoft-crm
EMAIL="${CERTBOT_EMAIL:-nf_alejo@yahoo.com}"
cd "$APP"

echo "========== 1. Código =========="
git checkout -- deploy/fix-bot-faqs.sh 2>/dev/null || true
git pull origin main

echo ""
echo "========== 2. Nginx HTTP (base para certbot) =========="
for f in api crm wa n8n; do
    cp "$APP/deploy/nginx/http/${f}.camsoft.com.co.conf" \
       "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
    ln -sf "/etc/nginx/sites-available/${f}.camsoft.com.co.conf" \
           "/etc/nginx/sites-enabled/${f}.camsoft.com.co.conf"
done
nginx -t && systemctl reload nginx

echo ""
echo "========== 3. Certificado SSL POR subdominio =========="
for d in api.camsoft.com.co crm.camsoft.com.co wa.camsoft.com.co n8n.camsoft.com.co; do
    echo "--- certbot: $d"
    certbot certonly --nginx -d "$d" \
        --non-interactive --agree-tos -m "$EMAIL" \
        --keep-until-expiring || echo "(cert $d: ya existe o falló — continúo)"
done

echo ""
echo "Certificados:"
ls -la /etc/letsencrypt/live/ 2>/dev/null || true

echo ""
echo "========== 4. Nginx HTTPS final =========="
for f in api crm wa n8n; do
    if [ -f "/etc/letsencrypt/live/${f}.camsoft.com.co/fullchain.pem" ]; then
        cp "$APP/deploy/nginx/${f}.camsoft.com.co.conf" \
           "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
    else
        echo "AVISO: sin cert para ${f}.camsoft.com.co — dejo HTTP"
    fi
done
nginx -t && systemctl reload nginx

echo ""
echo "========== 5. Webhook interno (Evolution -> API sin depender de SSL público) =========="
ENV_FILE="$APP/.env"
touch "$ENV_FILE"
if grep -q '^CAMSOFT_WEBHOOK_URL=' "$ENV_FILE"; then
    sed -i 's|^CAMSOFT_WEBHOOK_URL=.*|CAMSOFT_WEBHOOK_URL=http://host.docker.internal:3847/webhooks/whatsapp|' "$ENV_FILE"
else
    echo 'CAMSOFT_WEBHOOK_URL=http://host.docker.internal:3847/webhooks/whatsapp' >> "$ENV_FILE"
fi
if grep -q '^WHATSAPP_BOT_REPLY=' "$ENV_FILE"; then
    sed -i 's|^WHATSAPP_BOT_REPLY=.*|WHATSAPP_BOT_REPLY=true|' "$ENV_FILE"
else
    echo 'WHATSAPP_BOT_REPLY=true' >> "$ENV_FILE"
fi
grep -E 'CAMSOFT_WEBHOOK|WHATSAPP_BOT' "$ENV_FILE"

echo ""
echo "========== 6. Docker + API =========="
docker compose up -d
cd "$APP/api"
npm install --omit=dev 2>/dev/null || true
systemctl restart camsoft-crm
sleep 5

echo ""
echo "========== 7. Probar API y webhook =========="
curl -sf http://127.0.0.1:3847/health && echo "" || {
    journalctl -u camsoft-crm -n 20 --no-pager
    exit 1
}

curl -sf -X POST http://127.0.0.1:3847/webhooks/whatsapp \
    -H "Content-Type: application/json" \
    -d '{"event":"messages.upsert","instance":"camsoft","data":{"key":{"remoteJid":"573001234567@s.whatsapp.net","fromMe":false,"id":"test1"},"message":{"conversation":"hola"},"pushName":"Test"}}' \
    && echo "webhook OK"

echo ""
echo "========== 8. Reiniciar Evolution (aplica webhook) =========="
docker compose restart evolution-api
sleep 8
docker compose ps evolution-api

echo ""
echo "============================================"
echo "LISTO:"
echo "  https://wa.camsoft.com.co/manager  (candado verde)"
echo "  https://api.camsoft.com.co/health"
echo "  Escribe 'hola' por WhatsApp — debe responder el bot"
echo ""
echo "Si SSL sigue rojo en el navegador, prueba modo incógnito."
echo "============================================"
