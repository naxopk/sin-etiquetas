#!/usr/bin/env bash
# Opcional y recomendado si la web se hace viral: con Cloudflare delante, solo Cloudflare puede
# llegar a los puertos 80 y 443. Así nadie puede falsear la cabecera cf-connecting-ip ni atacar
# el servidor saltándose Cloudflare. Ejecútalo como root después de activar el proxy en Cloudflare.
set -euo pipefail
for v in v4 v6; do
  for ip in $(curl -fsSL "https://www.cloudflare.com/ips-$v"); do
    ufw allow proto tcp from "$ip" to any port 80,443 >/dev/null
  done
done
ufw delete allow 80/tcp >/dev/null 2>&1 || true
ufw delete allow 443/tcp >/dev/null 2>&1 || true
ufw reload >/dev/null
echo "Puertos 80 y 443 abiertos solo a Cloudflare. Pon TRUST_PROXY_HEADER=cf-connecting-ip en .env y reinicia el servicio."
