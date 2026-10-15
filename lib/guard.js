"use strict";
/* Antifraude: comprobación antibots (Cloudflare Turnstile) y límite de envíos por conexión.
   La IP nunca se guarda: se convierte en una huella con una clave que cambia cada día,
   se guarda aparte de las respuestas y se borra a las 48 horas. */
const crypto = require("crypto");
const { CONFIG } = require("./config");

async function verifyTurnstile(token) {
  if (!CONFIG.TURNSTILE_SECRET) return { ok: true, skipped: true }; // modo desarrollo
  if (typeof token !== "string" || !token) return { ok: false };
  const form = new URLSearchParams({ secret: CONFIG.TURNSTILE_SECRET, response: token });
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const j = await r.json();
    return { ok: !!j.success };
  } catch (e) {
    return { ok: false, error: true };
  }
}

function clientIp(req) {
  // Detrás de Cloudflare: TRUST_PROXY_HEADER=cf-connecting-ip (y el cortafuegos solo admite a Cloudflare)
  const trusted = process.env.TRUST_PROXY_HEADER;
  if (trusted) { const v = req.headers[trusted.toLowerCase()]; if (typeof v === "string" && v) return v.split(",")[0].trim(); }
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf) return xf.split(",")[0].trim();
  return req.headers["x-real-ip"] || (req.socket && req.socket.remoteAddress) || "desconocida";
}

function connectionKey(ip, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return crypto.createHmac("sha256", `${CONFIG.RATE_SECRET}|${day}`).update(ip).digest("hex").slice(0, 32);
}

/* Devuelve true si la conexión ya ha alcanzado el límite de la última hora; si no, apunta el intento */
async function overRateLimit(d, ip) {
  const k = connectionKey(ip);
  const rows = await d.query("select count(*)::int as n from rate_hits where k = $1 and ts > now() - interval '1 hour'", [k]);
  if (rows[0].n >= CONFIG.RATE_PER_HOUR) return true;
  await d.query("insert into rate_hits (k) values ($1)", [k]);
  return false;
}

module.exports = { verifyTurnstile, clientIp, connectionKey, overRateLimit };
