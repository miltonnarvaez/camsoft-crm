#!/usr/bin/env bash
# Reconexión limpia WhatsApp — mismo chip (Evolution 2.3.7, sin licencia)
set -euo pipefail
cd /var/www/camsoft-crm

echo "============================================"
echo "RECONEXIÓN LIMPIA — chip negocio +57 316 681 2189"
echo "============================================"
echo ""
echo "ANTES en el teléfono NUEVO (+57 316 681 2189):"
echo "  Si tienes sesiones vinculadas ahí → ciérralas."
echo "  Si NO tienes el WhatsApp viejo (315...) → no importa;"
echo "  la sesión del servidor se borra en el paso 3."
echo ""
read -r -p "¿Listo para continuar? (s/n): " OK
if [ "$OK" != "s" ] && [ "$OK" != "S" ]; then
    echo "Hazlo primero y vuelve a ejecutar este script."
    exit 1
fi

APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)

echo ""
echo "=== 1. Evolution 2.3.7 (sin licencia) ==="
sed -i 's|evoapicloud/evolution-api:.*|evoapicloud/evolution-api:v2.3.7|g' docker-compose.yml
grep -q '^CONFIG_SESSION_PHONE_VERSION=' .env && \
  sed -i 's|^CONFIG_SESSION_PHONE_VERSION=.*|CONFIG_SESSION_PHONE_VERSION=2.3000.1039700148|' .env || \
  echo 'CONFIG_SESSION_PHONE_VERSION=2.3000.1039700148' >> .env

echo ""
echo "=== 2. Webhook OFF mientras escaneas QR ==="
sed -i 's/WEBHOOK_GLOBAL_ENABLED: "true"/WEBHOOK_GLOBAL_ENABLED: "false"/' docker-compose.yml
sed -i 's|^CAMSOFT_WEBHOOK_URL=.*|CAMSOFT_WEBHOOK_URL=http://127.0.0.1:9/disabled|' .env

docker compose up -d evolution-api --force-recreate
echo "Esperando Evolution 25s..."
sleep 25

echo ""
echo "=== 3. Borrar instancia vieja ==="
curl -sf -X DELETE -H "apikey: ${APIKEY}" "http://127.0.0.1:8080/instance/logout/camsoft" || true
curl -sf -X DELETE -H "apikey: ${APIKEY}" "http://127.0.0.1:8080/instance/delete/camsoft" || true
sleep 3

echo ""
echo "=== 4. Crear instancia camsoft + QR ==="
JSON=$(curl -sf -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
  "http://127.0.0.1:8080/instance/create" \
  -d '{"instanceName":"camsoft","integration":"WHATSAPP-BAILEYS","qrcode":true}') || JSON=""

if [ -z "$JSON" ]; then
    echo "ERROR al crear instancia"
    docker compose logs evolution-api --tail 15
    exit 1
fi

JSON=$(curl -sf -H "apikey: ${APIKEY}" "http://127.0.0.1:8080/instance/connect/camsoft") || JSON=""
B64=$(python3 - <<'PY' "$JSON"
import json, sys
raw = sys.argv[1] if len(sys.argv) > 1 else ""
try:
    d = json.loads(raw)
except Exception:
    sys.exit(0)
if isinstance(d, list) and d:
    print(d[0].get("base64") or "")
    sys.exit(0)
q = d.get("qrcode") or {}
if isinstance(q, list) and q:
    q = q[0]
print((q.get("base64") if isinstance(q, dict) else None) or d.get("base64") or "")
PY
)

if [ -z "$B64" ]; then
    echo "QR no generado. Usa Manager: https://wa.camsoft.com.co/manager/"
    exit 1
fi

mkdir -p admin/dist
cat > admin/dist/qr-whatsapp.html <<EOF
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR WhatsApp CamSoft</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif}
    .box{text-align:center;padding:24px}
    img{background:#fff;padding:12px;border-radius:12px;max-width:min(320px,90vw)}
    a{color:#60a5fa}
  </style>
</head>
<body>
  <div class="box">
    <h1>QR WhatsApp CamSoft</h1>
    <p>WhatsApp → Dispositivos vinculados → Vincular (escanea en 60 s)</p>
    <img src="${B64}" alt="QR WhatsApp" />
    <p><a href="/qr-whatsapp.html">Actualizar QR</a></p>
  </div>
</body>
</html>
EOF

echo ""
echo "============================================"
echo "ESCANEA AHORA (menos de 60 segundos):"
echo "  https://crm.camsoft.com.co/qr-whatsapp.html"
echo "============================================"
echo ""
read -r -p "¿Ya escaneaste y dice Conectado en CRM? (s/n): " CONN
if [ "$CONN" != "s" ] && [ "$CONN" != "S" ]; then
    echo "Escanea el QR y luego ejecuta: bash deploy/activar-despues-qr.sh"
    exit 0
fi

bash deploy/activar-despues-qr.sh
