#!/usr/bin/env bash
# EMERGENCIA — recuperar API + CRM + Evolution
set -euo pipefail

APP=/var/www/camsoft-crm
cd "$APP"

echo "========== 1. ESTADO ACTUAL =========="
echo "Puertos:"
ss -tlnp | grep -E ':3847|:8080|:5432' || echo "(ninguno escuchando)"
echo ""
echo "Docker:"
docker compose ps 2>/dev/null || echo "docker compose fallo"
echo ""
echo "API systemd:"
systemctl is-active camsoft-crm 2>/dev/null || true

echo ""
echo "========== 2. LEVANTAR SERVICIOS =========="
git pull origin main 2>/dev/null || true
docker compose up -d postgres redis evolution-api n8n
sleep 10
docker compose up -d

chmod 640 "$APP/.env" 2>/dev/null || true
chown root:www-data "$APP/.env" 2>/dev/null || true

cd "$APP/api"
npm install --omit=dev 2>/dev/null || true

cat > /etc/systemd/system/camsoft-crm.service << 'UNIT'
[Unit]
Description=CamSoft CRM API
After=network.target docker.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/camsoft-crm/api
EnvironmentFile=/var/www/camsoft-crm/.env
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable camsoft-crm
systemctl restart camsoft-crm
sleep 4

echo ""
echo "========== 3. TEST API LOCAL (debe ser JSON) =========="
if curl -sf http://127.0.0.1:3847/health; then
    echo ""
    echo "OK: API Node responde en puerto 3847"
else
    echo "FALLO API local. Logs:"
    journalctl -u camsoft-crm -n 30 --no-pager
    echo ""
    echo "Intentando como root..."
    systemctl stop camsoft-crm
    cd "$APP/api"
    nohup node src/index.js > /tmp/camsoft-api.log 2>&1 &
    sleep 3
    curl -sf http://127.0.0.1:3847/health && echo "" || cat /tmp/camsoft-api.log | tail -20
fi

echo ""
echo "========== 4. NGINX (api -> 3847, wa -> 8080) =========="
for f in api crm wa n8n; do
    cp "$APP/deploy/nginx/${f}.camsoft.com.co.conf" \
       "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
    ln -sf "/etc/nginx/sites-available/${f}.camsoft.com.co.conf" \
           "/etc/nginx/sites-enabled/${f}.camsoft.com.co.conf"
done

echo "proxy_pass configurados:"
grep -h "proxy_pass\|server_name" /etc/nginx/sites-enabled/*.camsoft.com.co.conf 2>/dev/null | head -20

if nginx -t 2>&1; then
    systemctl reload nginx
    echo "Nginx OK"
else
    echo "ERROR nginx -t. Certificados SSL pueden faltar."
    echo "Ejecuta: certbot --nginx -d api.camsoft.com.co -d crm.camsoft.com.co -d wa.camsoft.com.co -d n8n.camsoft.com.co"
fi

echo ""
echo "========== 5. BUILD CRM =========="
cd "$APP/admin"
npm install 2>/dev/null || true
npm run build 2>/dev/null || true

echo ""
echo "========== 6. TEST PUBLICO =========="
curl -sf https://api.camsoft.com.co/health && echo "" || \
curl -sf http://127.0.0.1:3847/health && echo "(solo local OK, nginx publico falla)" || \
echo "SIGUE FALLANDO — pega esta salida completa en el chat"

echo ""
echo "============================================"
echo "Prueba en navegador:"
echo "  https://api.camsoft.com.co/health"
echo "  https://crm.camsoft.com.co"
echo "  https://wa.camsoft.com.co/manager"
echo "============================================"
