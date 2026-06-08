#!/usr/bin/env bash
# Genera pagina HTML con QR WhatsApp (cuando el Manager muestra modal vacio)
set -euo pipefail
cd /var/www/camsoft-crm

git pull origin main 2>/dev/null || true

echo "==> Actualizar Evolution a v2.3.6"
docker compose pull evolution-api
docker compose up -d evolution-api

echo "Esperando Evolution..."
APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)
for i in $(seq 1 40); do
    if curl -sf -H "apikey: ${APIKEY}" http://127.0.0.1:8080/instance/fetchInstances >/dev/null 2>&1; then
        break
    fi
    sleep 3
done

echo "==> Recrear instancia camsoft"
curl -sf -X DELETE "http://127.0.0.1:8080/instance/delete/camsoft" -H "apikey: ${APIKEY}" || true
sleep 2

JSON=$(curl -sf -X POST "http://127.0.0.1:8080/instance/create" \
  -H "apikey: ${APIKEY}" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"camsoft","integration":"WHATSAPP-BAILEYS","qrcode":true}') || JSON=""

B64=$(python3 - <<'PY' "$JSON"
import json, sys
raw = sys.argv[1] if len(sys.argv) > 1 else ""
if not raw:
    sys.exit(0)
try:
    d = json.loads(raw)
except Exception:
    sys.exit(0)
q = d.get("qrcode") or {}
if isinstance(q, list) and q:
    q = q[0]
if isinstance(q, dict):
    print(q.get("base64") or "")
else:
    print(d.get("base64") or "")
PY
)

if [ -z "$B64" ]; then
    JSON=$(curl -sf "http://127.0.0.1:8080/instance/connect/camsoft" -H "apikey: ${APIKEY}") || JSON=""
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
fi

if [ -z "$B64" ]; then
    echo "ERROR: Evolution no devolvio QR."
    docker compose logs evolution-api --tail 30
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
    <p>WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
    <img src="${B64}" alt="QR WhatsApp" />
    <p>Expira en ~60 s. <a href="/qr-whatsapp.html">Actualizar</a></p>
  </div>
</body>
</html>
EOF

echo ""
echo "============================================"
echo "Abre en el navegador:"
echo "  https://crm.camsoft.com.co/qr-whatsapp.html"
echo "============================================"
