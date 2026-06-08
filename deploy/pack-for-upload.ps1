# Crea camsoft-crm.zip para subir manualmente (sin SSH local)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Parent = Split-Path $Root -Parent
$Zip = Join-Path $Parent "camsoft-crm.zip"

if (Test-Path $Zip) { Remove-Item $Zip -Force }

Write-Host "Creando $Zip ..." -ForegroundColor Cyan
Compress-Archive -Path $Root -DestinationPath $Zip -Force

Write-Host ""
Write-Host "Listo. Sube el zip con UNA de estas opciones:" -ForegroundColor Green
Write-Host ""
Write-Host "A) GitHub (recomendado) - ver deploy/DESPLIEGUE-SIN-SSH-LOCAL.md"
Write-Host ""
Write-Host "B) Google Drive: sube $Zip en el navegador y usa el ID en el droplet"
Write-Host ""
Write-Host "C) file.io:"
Write-Host "   curl.exe -F `"file=@camsoft-crm.zip`" https://file.io"
Write-Host ""
Write-Host "En consola DigitalOcean:"
Write-Host "   cd /var/www && curl -L -o camsoft-crm.zip URL"
Write-Host "   apt-get install -y unzip && rm -rf camsoft-crm && unzip -o camsoft-crm.zip"
Write-Host "   cd camsoft-crm && bash deploy/bootstrap-on-server.sh"
