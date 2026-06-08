#!/usr/bin/env bash
# Ejecutar DENTRO del droplet (consola DigitalOcean o SSH).
# Copia el proyecto a /var/www/camsoft-crm antes (ver README deploy).

set -euo pipefail

APP_DIR="/var/www/camsoft-crm"
cd "$APP_DIR"

if [ ! -f deploy/install.sh ]; then
  echo "ERROR: No hay archivos en $APP_DIR"
  echo "Sube la carpeta camsoft-crm desde tu PC con:"
  echo "  scp -r camsoft-crm root@161.35.188.74:/var/www/"
  exit 1
fi

if [ ! -f .env ]; then
  echo "Creando .env con contraseñas aleatorias..."
  PG=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  EVO=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  JWT=$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)
  ADM=$(openssl rand -base64 12 | tr -d '/+=' | head -c 16)
  cat > .env << EOF
POSTGRES_USER=camsoft
POSTGRES_PASSWORD=${PG}
POSTGRES_DB=camsoft_crm
EVOLUTION_API_KEY=${EVO}
EVOLUTION_PUBLIC_URL=https://wa.camsoft.com.co
EVOLUTION_INSTANCE=camsoft
CAMSOFT_WEBHOOK_URL=https://api.camsoft.com.co/webhooks/whatsapp
N8N_HOST=n8n.camsoft.com.co
N8N_PUBLIC_URL=https://n8n.camsoft.com.co
PORT=3847
DATABASE_URL=postgresql://camsoft:${PG}@127.0.0.1:5432/camsoft_crm
JWT_SECRET=${JWT}
ADMIN_EMAIL=admin@camsoft.com.co
ADMIN_PASSWORD=${ADM}
CORS_ORIGIN=https://camsoft.com.co
WHATSAPP_ENABLED=true
WHATSAPP_BOT_REPLY=true
EVOLUTION_API_URL=http://127.0.0.1:8080
EOF
  echo ""
  echo "=== GUARDA ESTAS CREDENCIALES ==="
  echo "CRM: https://crm.camsoft.com.co"
  echo "Email: admin@camsoft.com.co"
  echo "Password: ${ADM}"
  echo "================================="
fi

chmod +x deploy/install.sh
bash deploy/install.sh

echo ""
echo "SSL (cuando DNS apunte al droplet):"
echo "  certbot --nginx -d api.camsoft.com.co -d crm.camsoft.com.co -d wa.camsoft.com.co -d n8n.camsoft.com.co"
