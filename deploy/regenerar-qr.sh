#!/usr/bin/env bash
# QR nuevo rapido — sin docker pull, sin borrar volumen
set -euo pipefail
cd /var/www/camsoft-crm

APIKEY=$(grep ^EVOLUTION_API_KEY= .env | cut -d= -f2-)

echo "Esperando Evolution..."
for i in $(seq 1 20); do
    if curl -sf -H "apikey: ${APIKEY}" http://127.0.0.1:8080/instance/fetchInstances >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

echo "=== Instancias actuales ==="
curl -sf -H "apikey: ${APIKEY}" http://127.0.0.1:8080/instance/fetchInstances | python3 -m json.tool 2>/dev/null || echo "(ninguna)"

echo ""
echo "=== Crear o reconectar camsoft ==="
EXISTS=$(curl -sf -H "apikey: ${APIKEY}" http://127.0.0.1:8080/instance/fetchInstances | grep -c '"name":"camsoft"' || true)
if [ "$EXISTS" = "0" ]; then
    echo "Creando instancia camsoft..."
    JSON=$(curl -sf -X POST -H "apikey: ${APIKEY}" -H "Content-Type: application/json" \
      "http://127.0.0.1:8080/instance/create" \
      -d '{"instanceName":"camsoft","integration":"WHATSAPP-BAILEYS","qrcode":true}') || JSON=""
else
    echo "Instancia existe — pidiendo QR nuevo..."
    curl -sf -X DELETE -H "apikey: ${APIKEY}" "http://127.0.0.1:8080/instance/logout/camsoft" || true
    sleep 2
    JSON=$(curl -sf -H "apikey: ${APIKEY}" "http://127.0.0.1:8080/instance/connect/camsoft") || JSON=""
fi

B64=$(python3 - <<'PY' "$JSON"
import json, sys
raw = sys.argv[1] if len(sys.argv) > 1 else ""
if not raw:
    sys.exit(0)
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
    echo "Sin QR — intentando connect..."
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
fi

if [ -z "$B64" ]; then
    echo "ERROR: no hubo QR. Logs:"
    docker compose logs evolution-api --tail 20
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
    <p>WhatsApp 316 681 2189 → Dispositivos vinculados → Vincular</p>
    <img src="${B64}" alt="QR WhatsApp" />
    <p>Expira en ~60 s. Ejecuta de nuevo: <code>bash deploy/regenerar-qr.sh</code></p>
  </div>
</body>
</html>
EOF

echo ""
echo "============================================"
echo "ESCANEA AHORA (menos de 60 segundos):"
echo "  https://crm.camsoft.com.co/qr-whatsapp.html"
echo "============================================"
