#!/usr/bin/env bash
# Repara Nginx (HTTP sin certificados) y ejecuta certbot.
set -euo pipefail

APP_DIR="/var/www/camsoft-crm"
cd "$APP_DIR"

echo "==> Actualizar configs Nginx (solo HTTP)"
for f in api crm wa n8n; do
    cp "$APP_DIR/deploy/nginx/${f}.camsoft.com.co.conf" "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
    ln -sf "/etc/nginx/sites-available/${f}.camsoft.com.co.conf" "/etc/nginx/sites-enabled/"
done

nginx -t
systemctl reload nginx
echo "Nginx OK en HTTP"

echo ""
echo "==> Certbot SSL (requiere DNS apuntando al droplet)"
certbot --nginx \
    -d api.camsoft.com.co \
    -d crm.camsoft.com.co \
    -d wa.camsoft.com.co \
    -d n8n.camsoft.com.co \
    --non-interactive --agree-tos -m nf_alejo@yahoo.com || {
    echo ""
    echo "Si certbot fallo: verifica DNS A records -> IP del droplet y vuelve a ejecutar certbot."
    exit 1
}

echo ""
echo "Listo. Prueba https://crm.camsoft.com.co"
