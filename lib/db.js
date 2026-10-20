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
// Se comprueba el disparador de los sellos, así un esquema a medias también se completa.
// Las tablas añadidas después (source_counts) se intentan crear, pero si falla (en el VPS la aplicación
// no puede crear tablas: hay que ejecutar npm run db:init) la web sigue funcionando sin ellas.
let ready = null;
function db() {
  if (!ready) ready = connect().then(async (d) => {
    const [s] = await d.query(
      "select exists (select 1 from pg_trigger where tgname = 'seals_inmutable') as core, to_regclass('source_counts') is not null as sources"
    );
    if (!s.core) await applySchema(d);
    else if (!s.sources) await applySchema(d).catch((e) => console.error("Esquema sin actualizar (ejecuta npm run db:init):", e.message));
    return d;
  }).catch((e) => { ready = null; throw e; });
  return ready;
}

async function migrate() {
  await applySchema(await connect());
}

function hasDatabase() { return !!process.env.DATABASE_URL; }

module.exports = { db, migrate, hasDatabase, splitSql };
