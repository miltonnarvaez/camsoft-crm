#!/usr/bin/env bash
# Fix: no desconectar WhatsApp al abrir pestaña WA
set -euo pipefail
cd /var/www/camsoft-crm
git pull origin main
cd admin && npm install && npm run build
cd ..
systemctl restart camsoft-crm
echo "Listo. Abre CRM -> WA -> Actualizar estado (Ctrl+F5)"
