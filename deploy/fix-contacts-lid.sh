#!/usr/bin/env bash
# Corrige contactos con ID interno @lid guardado como teléfono (causa Bad Request al enviar)
set -euo pipefail
APP=/var/www/camsoft-crm
cd "$APP"

echo "==> Contactos antes:"
docker compose exec -T postgres psql -U camsoft -d camsoft_crm -c \
    "SELECT id, name, phone, external_id FROM contacts WHERE source='whatsapp';"

echo ""
echo "==> Corrigiendo IDs @lid mal guardados..."
docker compose exec -T postgres psql -U camsoft -d camsoft_crm <<'SQL'
-- Teléfonos imposibles (14+ dígitos) = ID interno WhatsApp, no número real
UPDATE contacts
SET external_id = phone || '@lid',
    phone = NULL,
    updated_at = NOW()
WHERE source = 'whatsapp'
  AND phone IS NOT NULL
  AND LENGTH(phone) > 13
  AND external_id NOT LIKE '%@%';

-- Contacto de prueba falso del script
DELETE FROM messages WHERE conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN contacts ct ON ct.id = c.contact_id
    WHERE ct.phone = '573001234567'
);
DELETE FROM leads WHERE contact_id IN (SELECT id FROM contacts WHERE phone = '573001234567');
DELETE FROM conversations WHERE contact_id IN (SELECT id FROM contacts WHERE phone = '573001234567');
DELETE FROM contacts WHERE phone = '573001234567';
SQL

echo ""
echo "==> Contactos después:"
docker compose exec -T postgres psql -U camsoft -d camsoft_crm -c \
    "SELECT id, name, phone, external_id FROM contacts WHERE source='whatsapp';"

echo ""
echo "Listo. Reinicia API y pide al cliente que escriba 'hola' de nuevo."
systemctl restart camsoft-crm
