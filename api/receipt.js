"use strict";
/* GET /api/receipt?r=<recibo> · dice si un recibo está en el registro y, si su día ya está sellado,
   devuelve la prueba de Merkle para que el navegador la compruebe por su cuenta. */
const { db, hasDatabase } = require("../lib/db");
const { merkleProof } = require("../lib/ledger");
const { iso } = require("../lib/sealing");
const { send, readQuery } = require("../lib/http");

module.exports = async (req, res) => {
  const r = String(readQuery(req).r || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(r)) return send(res, 400, { error: "El recibo son 64 caracteres hexadecimales" });
  if (!hasDatabase()) return send(res, 503, { error: "Registro no disponible" });
  try {
    const d = await db();
    const rows = await d.query("select id, day::text as day from responses where leaf = $1", [r]);
    if (!rows.length) return send(res, 200, { found: false });
    const day = iso(rows[0].day);
    const seal = await d.query("select day::text as day, n, merkle_root, prev, chain from seals where day = $1::date", [day]);
    if (!seal.length) return send(res, 200, { found: true, day, sealed: false });
    const leaves = (await d.query("select leaf from responses where day = $1::date order by id", [day])).map((x) => x.leaf);
    const index = leaves.indexOf(r);
    const s = seal[0];
    return send(res, 200, {
      found: true, day, sealed: true, index, n: leaves.length,
      seal: { day, n: s.n, merkle_root: s.merkle_root, prev: s.prev, chain: s.chain },
      proof: merkleProof(leaves, index),
    }, "public, s-maxage=3600");
  } catch (e) {
    console.error("receipt", e);
    return send(res, 500, { error: "Error interno" });
  }
};
