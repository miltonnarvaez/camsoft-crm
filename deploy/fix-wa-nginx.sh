#!/usr/bin/env bash
# Reparar wa.camsoft.com.co (SSL + proxy Evolution)
set -euo pipefail
cd /var/www/camsoft-crm
git pull origin main

docker compose up -d evolution-api
sleep 5

cp deploy/nginx/wa.camsoft.com.co.conf /etc/nginx/sites-available/wa.camsoft.com.co.conf
ln -sf /etc/nginx/sites-available/wa.camsoft.com.co.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "Test local Evolution:"
curl -sf -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8080/manager || echo "Evolution no responde en 8080"

echo ""
echo "Abre: https://wa.camsoft.com.co/manager"
echo "No uses enlaces viejos /chat/... — entra desde Instances -> camsoft -> Chat"
