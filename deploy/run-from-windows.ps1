# Ejecutar en PowerShell:
#   cd "c:\Users\Milton Narvaez\Documents\cursor\milton\camsoft-crm"
#   .\deploy\run-from-windows.ps1

$ErrorActionPreference = "Stop"
$HostIP = "161.35.188.74"
$User = "root"
$CrmRoot = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path $CrmRoot)) {
    throw "No se encontro camsoft-crm en $CrmRoot"
}

Write-Host "CamSoft CRM - despliegue a ${User}@${HostIP}" -ForegroundColor Cyan
Write-Host "Firewall DO: SSH 22, HTTP 80, HTTPS 443" -ForegroundColor Yellow

$pass = Read-Host "Contrasena SSH root" -AsSecureString
$BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass)
$Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

$env:CAMSOFT_SSH_HOST = $HostIP
$env:CAMSOFT_SSH_USER = $User
$env:CAMSOFT_SSH_PASS = $Plain

$py = Join-Path $CrmRoot "deploy\remote_deploy.py"
python $py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Siguiente en el droplet:" -ForegroundColor Green
Write-Host "  certbot --nginx -d api.camsoft.com.co -d crm.camsoft.com.co -d wa.camsoft.com.co -d n8n.camsoft.com.co"
Write-Host "  DNS A: api, crm, wa, n8n -> $HostIP"
