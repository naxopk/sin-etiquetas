"use strict";
/* Crea o actualiza las tablas. Se puede ejecutar varias veces.
   En el VPS usa ADMIN_DATABASE_URL (dueño de las tablas) y después da al usuario de la aplicación
   solo los permisos mínimos (db/grants.sql). En Vercel/Neon o en local basta con DATABASE_URL. */
require("../lib/env").loadEnv();
const fs = require("fs");
const path = require("path");
const admin = process.env.ADMIN_DATABASE_URL;
if (admin) process.env.DATABASE_URL = admin;
const { db, migrate } = require("../lib/db");

(async () => {
  await migrate();
  if (admin) await (await db()).exec(fs.readFileSync(path.join(__dirname, "..", "db", "grants.sql"), "utf8"));
  console.log(admin ? "Tablas listas y permisos de se_app aplicados." : "Tablas listas.");
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
