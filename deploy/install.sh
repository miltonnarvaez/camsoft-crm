#!/usr/bin/env bash
# Ejecutar EN EL DROPLET como root:
#   bash /var/www/camsoft-crm/deploy/install.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/camsoft-crm}"
cd "$APP_DIR"

install_docker() {
    if command -v docker >/dev/null 2>&1; then
        echo "Docker ya instalado: $(docker --version)"
        return 0
    fi
    echo "==> Instalando Docker (repositorio oficial)"
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "Docker listo: $(docker --version)"
}

install_node() {
    if command -v node >/dev/null 2>&1 && [ "$(node -p 'process.version.slice(1).split(".")[0]')" -ge 18 ] 2>/dev/null; then
        echo "Node ya instalado: $(node --version)"
        return 0
    fi
    echo "==> Instalando Node.js 20"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
    echo "Node listo: $(node --version)"
}

echo "==> Dependencias del sistema"
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx git curl
install_docker
install_node

echo "==> Docker Compose (PostgreSQL, Evolution, n8n)"
if [ ! -f .env ]; then
    echo "ERROR: Crea $APP_DIR/.env (usa deploy/bootstrap-on-server.sh)"
    exit 1
fi
docker compose up -d

echo "==> Esperando PostgreSQL..."
for i in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U camsoft >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

echo "==> API Node"
cd "$APP_DIR/api"
npm install --omit=dev

echo "==> Admin React"
cd "$APP_DIR/admin"
npm install
npm run build

echo "==> Nginx sites"
for f in api crm wa n8n; do
    cp "$APP_DIR/deploy/nginx/${f}.camsoft.com.co.conf" "/etc/nginx/sites-available/${f}.camsoft.com.co.conf"
    ln -sf "/etc/nginx/sites-available/${f}.camsoft.com.co.conf" "/etc/nginx/sites-enabled/"
done
nginx -t && systemctl reload nginx

echo "==> systemd API"
cp "$APP_DIR/deploy/camsoft-crm.service" /etc/systemd/system/camsoft-crm.service
systemctl daemon-reload
systemctl enable camsoft-crm
systemctl restart camsoft-crm

echo ""
echo "Listo. Siguiente:"
echo "  1. DNS A records: api, crm, wa, n8n -> IP del droplet"
echo "  2. certbot --nginx -d api.camsoft.com.co -d crm.camsoft.com.co -d wa.camsoft.com.co -d n8n.camsoft.com.co"
echo "  3. https://crm.camsoft.com.co -> pestaña WA -> QR WhatsApp"
