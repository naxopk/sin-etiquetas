#!/usr/bin/env bash
# Instala Sin Etiquetas en un VPS limpio con Ubuntu 24.04 (por ejemplo, un KVM de Hostinger).
# Uso, como root:  bash setup-vps.sh https://github.com/naxopk/sin-etiquetas.git
# Instala Node 20, Postgres, Caddy y el cortafuegos; crea la base de datos con dos usuarios
# (se_admin, dueño de las tablas, y se_app, con permisos mínimos); arranca el servicio y programa
# el sellado nocturno y las copias de seguridad. Se puede volver a ejecutar para actualizar.
set -euo pipefail

REPO="${1:?Indica la URL del repositorio de GitHub}"
APP=/srv/sin-etiquetas
USER_APP=sinetiquetas
BACKUPS=/srv/backups

[ "$(id -u)" = 0 ] || { echo "Ejecútalo como root"; exit 1; }

echo "== Paquetes del sistema"
apt-get update -y
apt-get install -y sudo curl git ufw ca-certificates gnupg postgresql debian-keyring debian-archive-keyring apt-transport-https

if ! command -v node >/dev/null || ! node -v | grep -q '^v2[0-9]'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "== Usuario y código"
id "$USER_APP" >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin "$USER_APP"
if [ -d "$APP/.git" ]; then git -C "$APP" pull --ff-only; else git clone "$REPO" "$APP"; fi
chown -R "$USER_APP:$USER_APP" "$APP"
sudo -u "$USER_APP" bash -c "cd $APP && npm ci --omit=dev --no-audit --no-fund"

echo "== Base de datos"
ENV_FILE="$APP/.env"
if [ ! -f "$ENV_FILE" ]; then
  ADMIN_PW=$(openssl rand -hex 24); APP_PW=$(openssl rand -hex 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'se_admin') THEN CREATE ROLE se_admin LOGIN PASSWORD '$ADMIN_PW'; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'se_app') THEN CREATE ROLE se_app LOGIN PASSWORD '$APP_PW'; END IF;
END \$\$;
SQL
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'sinetiquetas'" | grep -q 1 || sudo -u postgres createdb -O se_admin sinetiquetas
  sudo -u postgres psql -d sinetiquetas -c "REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO se_app;"
  cat > "$ENV_FILE" <<ENV
# Generado por setup-vps.sh. Completa las líneas vacías y reinicia: systemctl restart sin-etiquetas
DATABASE_URL=postgres://se_app:$APP_PW@127.0.0.1:5432/sinetiquetas
ADMIN_DATABASE_URL=postgres://se_admin:$ADMIN_PW@127.0.0.1:5432/sinetiquetas
RATE_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET=
PUBLISHER_NAME=
CONTACT_EMAIL=
REPO_URL=${REPO%.git}
# Si pones Cloudflare delante (recomendado), descomenta y ejecuta deploy/ufw-cloudflare.sh:
# TRUST_PROXY_HEADER=cf-connecting-ip
ENV
  chown "$USER_APP:$USER_APP" "$ENV_FILE"; chmod 600 "$ENV_FILE"
fi
sudo -u "$USER_APP" bash -c "cd $APP && node scripts/init-db.js"

echo "== Servicio, web y cortafuegos"
cp "$APP/deploy/sin-etiquetas.service" /etc/systemd/system/sin-etiquetas.service
systemctl daemon-reload
systemctl enable --now sin-etiquetas
systemctl restart sin-etiquetas
cp "$APP/deploy/Caddyfile" /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

echo "== Tareas nocturnas: sellado (00:10 UTC) y copia de seguridad (00:30 UTC, se guardan 14 días)"
mkdir -p "$BACKUPS" && chown postgres:postgres "$BACKUPS" && chmod 700 "$BACKUPS"
cat > /etc/cron.d/sin-etiquetas <<CRON
CRON_TZ=UTC
10 0 * * * $USER_APP cd $APP && /usr/bin/node scripts/seal.js 2>&1 | systemd-cat -t sin-etiquetas-sello
30 0 * * * postgres pg_dump sinetiquetas | gzip > $BACKUPS/sinetiquetas-\$(date +\%F).sql.gz && find $BACKUPS -name '*.sql.gz' -mtime +14 -delete
CRON

echo
echo "Listo. Pasos que faltan:"
echo "  1. Completa $ENV_FILE (Turnstile, responsable y contacto) y ejecuta: systemctl restart sin-etiquetas"
echo "  2. Comprueba: curl -s https://votasinetiquetas.es/api/config"
echo "  3. Guarda las copias de $BACKUPS también fuera del servidor."
