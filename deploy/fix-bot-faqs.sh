#!/usr/bin/env bash
# Repara textos del bot (saludo "Hola, soy el asistente de CamSoft...")
set -euo pipefail
APP=/var/www/camsoft-crm
cd "$APP"
git pull origin main 2>/dev/null || true
systemctl restart camsoft-crm
sleep 2
curl -sf http://127.0.0.1:3847/health && echo ""
echo "Listo. Escribe 'hola' de nuevo en WhatsApp o en el chat web para ver el saludo completo."
