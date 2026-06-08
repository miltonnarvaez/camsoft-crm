#!/usr/bin/env bash
# Paso 1: arreglar login CRM (CORS + reiniciar API)
set -euo pipefail
cd /var/www/camsoft-crm

git pull origin main

if grep -q '^CORS_ORIGIN=' .env; then
    sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://camsoft.com.co,https://crm.camsoft.com.co|' .env
else
    echo 'CORS_ORIGIN=https://camsoft.com.co,https://crm.camsoft.com.co' >> .env
fi

systemctl restart camsoft-crm
sleep 2
systemctl is-active camsoft-crm
curl -s http://127.0.0.1:3847/health
echo ""
echo "Listo. Prueba login en https://crm.camsoft.com.co"
