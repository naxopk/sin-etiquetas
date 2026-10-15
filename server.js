"use strict";
/* Servidor de producción para el VPS. Escucha solo en local: Caddy sirve la web, pone el HTTPS
   y le pasa las peticiones /api. Con SERVE_STATIC=1 sirve también la web (útil sin Caddy). */
require("./lib/env").loadEnv();
const { createServer } = require("./lib/server");

const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const server = createServer({ staticDir: process.env.SERVE_STATIC === "1" ? "public" : null });
server.listen(PORT, HOST, () => console.log(`Sin Etiquetas escuchando en ${HOST}:${PORT}`));

const stop = () => server.close(() => process.exit(0));
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
