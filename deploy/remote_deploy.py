#!/usr/bin/env python3
"""Despliegue one-shot vía SSH. Credenciales solo por variables de entorno."""
import os
import secrets
import stat
import sys
from pathlib import Path

import paramiko

HOST = os.environ.get("CAMSOFT_SSH_HOST", "")
USER = os.environ.get("CAMSOFT_SSH_USER", "root")
PASSWORD = os.environ.get("CAMSOFT_SSH_PASS", "")
REMOTE = "/var/www/camsoft-crm"
ROOT = Path(__file__).resolve().parent.parent


def run(client, cmd, check=True):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out.rstrip())
    if err:
        print(err.rstrip(), file=sys.stderr)
    if check and code != 0:
        raise RuntimeError(f"Comando falló ({code}): {cmd}")
    return code, out


def ensure_remote_dir(sftp, remote_dir: str):
    parts = remote_dir.strip("/").split("/")
    path = ""
    for part in parts:
        path += f"/{part}"
        try:
            sftp.stat(path)
        except (FileNotFoundError, OSError):
            sftp.mkdir(path)


def upload_dir(sftp, local: Path, remote: str):
    ensure_remote_dir(sftp, remote)
    for path in local.rglob("*"):
        rel = path.relative_to(local).as_posix()
        if rel == ".":
            continue
        rpath = f"{remote}/{rel}".replace("//", "/")
        if path.is_dir():
            ensure_remote_dir(sftp, rpath)
        else:
            ensure_remote_dir(sftp, "/".join(rpath.split("/")[:-1]))
            print(f"  {rel}")
            sftp.put(str(path), rpath)


def main():
    if not HOST or not PASSWORD:
        print("Define CAMSOFT_SSH_HOST y CAMSOFT_SSH_PASS", file=sys.stderr)
        sys.exit(1)

    pg_pass = secrets.token_urlsafe(24)
    evo_key = secrets.token_urlsafe(32)
    jwt_secret = secrets.token_urlsafe(48)
    admin_pass = secrets.token_urlsafe(16)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Conectando a {USER}@{HOST}…")
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    run(client, f"mkdir -p {REMOTE}")
    sftp = client.open_sftp()
    print(f"Subiendo archivos a {REMOTE}…")
    upload_dir(sftp, ROOT, REMOTE)
    sftp.close()

    env_content = f"""POSTGRES_USER=camsoft
POSTGRES_PASSWORD={pg_pass}
POSTGRES_DB=camsoft_crm
EVOLUTION_API_KEY={evo_key}
EVOLUTION_PUBLIC_URL=https://wa.camsoft.com.co
EVOLUTION_INSTANCE=camsoft
CAMSOFT_WEBHOOK_URL=https://api.camsoft.com.co/webhooks/whatsapp
N8N_HOST=n8n.camsoft.com.co
N8N_PUBLIC_URL=https://n8n.camsoft.com.co
PORT=3847
DATABASE_URL=postgresql://camsoft:{pg_pass}@127.0.0.1:5432/camsoft_crm
JWT_SECRET={jwt_secret}
ADMIN_EMAIL=admin@camsoft.com.co
ADMIN_PASSWORD={admin_pass}
CORS_ORIGIN=https://camsoft.com.co
WHATSAPP_ENABLED=true
WHATSAPP_BOT_REPLY=true
EVOLUTION_API_URL=http://127.0.0.1:8080
"""
    run(client, f"cat > {REMOTE}/.env << 'ENVEOF'\n{env_content}ENVEOF")
    run(client, f"chmod +x {REMOTE}/deploy/install.sh")

    print("\n==> Instalando (puede tardar varios minutos)…")
    run(client, f"bash {REMOTE}/deploy/install.sh", check=False)

    creds_path = ROOT.parent / "DEPLOY_CREDENTIALS.local.txt"
    creds_path.write_text(
        f"CamSoft CRM — guarda en lugar seguro y borra este archivo\n\n"
        f"CRM URL: https://crm.camsoft.com.co\n"
        f"Admin email: admin@camsoft.com.co\n"
        f"Admin password: {admin_pass}\n\n"
        f"PostgreSQL password: {pg_pass}\n"
        f"Evolution API key: {evo_key}\n",
        encoding="utf-8",
    )
    print(f"\nCredenciales admin guardadas en: {creds_path}")
    print("(archivo local, no subir a git)")

    client.close()
    print("\nDespliegue terminado. Revisa salida arriba por errores.")


if __name__ == "__main__":
    main()
