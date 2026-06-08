#!/usr/bin/env bash
set -euo pipefail
cd /var/www/camsoft-crm
git pull origin main
cp deploy/nginx/wa.camsoft.com.co.conf /etc/nginx/sites-available/wa.camsoft.com.co.conf
cd admin && npm run build
nginx -t && systemctl reload nginx
echo "Listo. Recarga wa.camsoft.com.co y crm.camsoft.com.co con Ctrl+F5"
