"use strict";
/* GET /api/dataset                → lista de sellos (todos los días cerrados)
   GET /api/dataset?day=AAAA-MM-DD&page=N → filas públicas de un día sellado, de 2.000 en 2.000.
   Solo se publican días sellados, para que lo publicado coincida siempre con su sello. */
const { db, hasDatabase } = require("../lib/db");
const { publicRow, PUBLIC_FIELDS } = require("../lib/ledger");
const { iso } = require("../lib/sealing");
const { send, readQuery } = require("../lib/http");

const PAGE = 2000;

module.exports = async (req, res) => {
  if (!hasDatabase()) return send(res, 503, { error: "Registro no disponible" });
  const q = readQuery(req);
  try {
    const d = await db();
    if (!q.day) {
      const seals = await d.query("select day::text as day, n, merkle_root, prev, chain, sealed_at from seals order by day");
      return send(res, 200, { seals: seals.map((s) => ({ ...s, day: iso(s.day) })) }, "public, s-maxage=300");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(q.day)) return send(res, 400, { error: "Fecha no válida" });
    const seal = await d.query("select day::text as day, n, merkle_root, prev, chain from seals where day = $1::date", [q.day]);
    if (!seal.length) return send(res, 404, { error: "Ese día aún no está sellado" });
    const page = Math.max(0, parseInt(q.page || "0", 10) || 0);
    const rows = await d.query(
      `select ${PUBLIC_FIELDS.join(", ")}, leaf from responses where day = $1::date order by id limit ${PAGE} offset ${page * PAGE}`,
      [q.day]
    );
    const s = seal[0];
    return send(res, 200, {
      day: q.day, page, pageSize: PAGE, pages: Math.ceil(s.n / PAGE), fields: PUBLIC_FIELDS,
      seal: { day: q.day, n: s.n, merkle_root: s.merkle_root, prev: s.prev, chain: s.chain },
      rows: rows.map((r) => ({ ...publicRow(r), leaf: r.leaf })),
    }, "public, s-maxage=86400, immutable");
  } catch (e) {
    console.error("dataset", e);
    return send(res, 500, { error: "Error interno" });
  }
};
