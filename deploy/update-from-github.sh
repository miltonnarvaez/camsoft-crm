#!/usr/bin/env bash
# Actualiza desde GitHub descartando cambios locales en deploy/ (evita conflictos en el servidor)
set -euo pipefail
APP=/var/www/camsoft-crm
cd "$APP"

echo "==> Descartando cambios locales en deploy/"
git checkout -- deploy/ 2>/dev/null || true
git clean -fd deploy/ 2>/dev/null || true

echo "==> git pull"
git pull origin main

echo "==> OK — código actualizado"
git log -1 --oneline

if [ "${1:-}" != "" ]; then
    SCRIPT="$1"
    if [ ! -f "$SCRIPT" ]; then
        echo "ERROR: no existe $SCRIPT"
        exit 1
    fi
    chmod +x "$SCRIPT"
    echo "==> Ejecutando $SCRIPT"
    bash "$SCRIPT"
fi
