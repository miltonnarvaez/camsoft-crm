# Despliegue sin SSH local (alternativas)

Tu PC no conecta a SSH (puerto 22) ni a transfer.sh. Usa una de estas opciones.

---

## Opcion 1 — GitHub (recomendada)

Git usa HTTPS (puerto 443), igual que tu navegador.

### En tu PC (PowerShell)

```powershell
cd "c:\Users\Milton Narvaez\Documents\cursor\milton\camsoft-crm"
git init
git add .
git commit -m "CamSoft CRM inicial"
```

Crea un repo vacio en https://github.com/new (nombre: `camsoft-crm`, privado).

```powershell
git branch -M main
git remote add origin https://github.com/TU_USUARIO/camsoft-crm.git
git push -u origin main
```

(GitHub te pedira usuario y token si no tienes credenciales guardadas.)

### En consola DigitalOcean (root@milton-server)

```bash
apt-get update && apt-get install -y git
cd /var/www
rm -rf camsoft-crm
git clone https://github.com/TU_USUARIO/camsoft-crm.git
cd camsoft-crm
chmod +x deploy/bootstrap-on-server.sh
bash deploy/bootstrap-on-server.sh
```

---

## Opcion 2 — Google Drive (sin git)

1. Sube `camsoft-crm.zip` a Google Drive desde el navegador.
2. Clic derecho → Compartir → **Cualquier persona con el enlace**.
3. Copia el enlace. Ejemplo:
   `https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing`
4. El ID del archivo es la parte entre `/d/` y `/view` → `1ABC123xyz`

### En el droplet

```bash
cd /var/www
FILE_ID="PEGA_EL_ID_AQUI"
curl -L "https://drive.google.com/uc?export=download&id=${FILE_ID}" -o camsoft-crm.zip
apt-get install -y unzip
rm -rf camsoft-crm
unzip -o camsoft-crm.zip
cd camsoft-crm
bash deploy/bootstrap-on-server.sh
```

---

## Opcion 3 — file.io (un intento)

```powershell
cd "c:\Users\Milton Narvaez\Documents\cursor\milton"
curl.exe -F "file=@camsoft-crm.zip" https://file.io
```

Copia la URL `"link"` del JSON. En el droplet:

```bash
cd /var/www
curl -L -o camsoft-crm.zip "URL_DEL_JSON"
apt-get install -y unzip && rm -rf camsoft-crm && unzip -o camsoft-crm.zip
cd camsoft-crm && bash deploy/bootstrap-on-server.sh
```

(Solo se puede descargar una vez.)

---

## Despues del bootstrap

1. **DNS** A records → `161.35.188.74`: api, crm, wa, n8n
2. **SSL:** `certbot --nginx -d api.camsoft.com.co -d crm.camsoft.com.co -d wa.camsoft.com.co -d n8n.camsoft.com.co`
3. **CRM:** https://crm.camsoft.com.co (contrasena que imprime el script)
4. **WhatsApp:** pestaña WA → escanear QR

---

## Por que fallan SSH y transfer.sh

- **SSH timeout:** tu red bloquea salida al puerto 22 del droplet.
- **transfer.sh:** el servicio no responde o esta bloqueado desde tu ISP.

La consola web de DigitalOcean siempre funciona porque no usa tu red local.
