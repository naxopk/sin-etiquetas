"use strict";
/* Acceso a la base de datos.
   Producción en VPS: Postgres normal (postgres://…), con el conductor pg.
   Producción en Vercel: Neon por HTTP (URL de *.neon.tech).
   Desarrollo y tests: DATABASE_URL=pglite:memory:// o pglite:./.pglite (Postgres en WebAssembly, sin instalar nada). */
const fs = require("fs");
const path = require("path");

let impl = null;

function splitSql(text) {
  // Separa sentencias respetando los bloques $$ … $$ de las funciones
  const out = []; let cur = ""; let inDollar = false;
  for (const line of text.split("\n")) {
    if (/^\s*--/.test(line)) continue;
    const marks = (line.match(/\$\$/g) || []).length;
    if (marks % 2 === 1) inDollar = !inDollar;
    cur += line + "\n";
    if (!inDollar && /;\s*$/.test(line)) { out.push(cur.trim()); cur = ""; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function connect() {
  if (impl) return impl;
  const url = process.env.DATABASE_URL || "";
  if (!url) throw new Error("Falta DATABASE_URL");
  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite(url.slice("pglite:".length) || "memory://");
    impl = {
      query: async (text, params) => (await pg.query(text, params || [])).rows,
      exec: async (text) => { await pg.exec(text); },
    };
  } else if (/\.neon\.tech/.test(url)) {
    const { neon } = require("@neondatabase/serverless");
    const sql = neon(url);
    impl = {
      query: (text, params) => sql.query(text, params || []),
      exec: async (text) => { for (const s of splitSql(text)) await sql.query(s); },
    };
  } else {
    // Postgres normal (VPS): conexiones reutilizables
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: url, max: +process.env.PG_POOL_MAX || 10 });
    impl = {
      query: async (text, params) => (await pool.query(text, params || [])).rows,
      exec: async (text) => { await pool.query(text); },
    };
  }
  return impl;
}

async function applySchema(d) {
  await d.exec(fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8"));
}

// En Vercel/Neon nadie ejecuta db:init: si falta el esquema, se crea la primera vez que se usa la base de datos.
// Se comprueba lo último que crea schema.sql (el disparador de los sellos), así un esquema a medias también se completa.
let ready = null;
function db() {
  if (!ready) ready = connect().then(async (d) => {
    const rows = await d.query("select 1 from pg_trigger where tgname = 'seals_inmutable'");
    if (!rows.length) await applySchema(d);
    return d;
  }).catch((e) => { ready = null; throw e; });
  return ready;
}

async function migrate() {
  await applySchema(await connect());
}

function hasDatabase() { return !!process.env.DATABASE_URL; }

module.exports = { db, migrate, hasDatabase, splitSql };
