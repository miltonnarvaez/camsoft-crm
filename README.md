# CamSoft CRM

Chat web + WhatsApp + panel CRM. Todo en tu Droplet DigitalOcean, sin costo extra de servicios cloud.

## Componentes

| Servicio | URL | Puerto local |
|----------|-----|--------------|
| API + widget | `api.camsoft.com.co` | 3847 |
| Panel CRM | `crm.camsoft.com.co` | estático |
| Evolution API (WhatsApp) | `wa.camsoft.com.co` | 8080 |
| n8n | `n8n.camsoft.com.co` | 5678 |
| PostgreSQL | localhost | 5432 |

## WhatsApp sin Meta de pago

Usa [Evolution API](https://github.com/EvolutionAPI/evolution-api) (open source) en tu servidor:

1. Entra a `crm.camsoft.com.co` → pestaña **WA**
2. Escanea el QR con el WhatsApp del negocio (número dedicado recomendado)
3. Los mensajes entrantes llegan al mismo inbox que el chat web
4. El bot responde automáticamente; tú puedes intervenir desde el CRM

**Nota:** No es la API oficial de Meta. Usa un número de negocio y evita envíos masivos.

## Despliegue rápido

```bash
# En el droplet
git clone <tu-repo> /var/www/camsoft-crm
cd /var/www/camsoft-crm
cp .env.example .env
# Edita .env con contraseñas seguras
bash deploy/install.sh
```

## Widget en camsoft.com.co

```html
<script>window.CAMSOFT_CHAT_API = 'https://api.camsoft.com.co';</script>
<script src="https://api.camsoft.com.co/widget.js" defer></script>
```

## Desarrollo local

```bash
cd api && npm install && npm run dev
cd admin && npm install && npm run dev
```
