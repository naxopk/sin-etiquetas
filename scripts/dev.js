"use strict";
/* Servidor local para desarrollar: la web y las funciones /api.
   Uso: DATABASE_URL=pglite:./.pglite npm run dev   (sin DATABASE_URL, el test funciona pero no se envía nada) */
const { createServer } = require("../lib/server");

const PORT = +process.env.PORT || 3000;
if ((process.env.DATABASE_URL || "").startsWith("pglite:")) {
  require("../lib/db").migrate().then(() => console.log("Base de datos local lista"));
}
createServer({ staticDir: "public" }).listen(PORT, "127.0.0.1", () => console.log(`Sin Etiquetas en http://127.0.0.1:${PORT}`));
