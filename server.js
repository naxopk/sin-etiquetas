"use strict";
/* Servidor de producción para el VPS. Escucha solo en local: Caddy sirve la web, pone el HTTPS
   y le pasa las peticiones /api. Con SERVE_STATIC=1 sirve también la web (útil sin Caddy). */
require("./lib/env").loadEnv();
const { createServer } = require("./lib/server");
const { CONFIG } = require("./lib/config");

// Avisos al arrancar: lo que falta para que la web esté lista de verdad
const missing = [];
if (!CONFIG.TURNSTILE_SECRET || !CONFIG.TURNSTILE_SITE_KEY) missing.push("TURNSTILE_SITE_KEY y TURNSTILE_SECRET: sin ellas no hay comprobación antibots");
if (CONFIG.RATE_SECRET === "cambia-esto-en-produccion") missing.push("RATE_SECRET: usa un valor aleatorio (openssl rand -hex 32)");
if (CONFIG.PUBLISHER.startsWith("[")) missing.push("PUBLISHER_NAME: la ficha técnica y la privacidad muestran un hueco");
if (CONFIG.CONTACT.startsWith("[")) missing.push("CONTACT_EMAIL: la ficha técnica y la privacidad muestran un hueco");
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("pglite")) missing.push("DATABASE_URL: en producción debe ser Postgres");
for (const m of missing) console.warn("AVISO · falta " + m);

const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const server = createServer({ staticDir: process.env.SERVE_STATIC === "1" ? "public" : null });
server.listen(PORT, HOST, () => console.log(`Sin Etiquetas escuchando en ${HOST}:${PORT}`));

const stop = () => server.close(() => process.exit(0));
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
