"use strict";
/* Registro verificable.
   - Cada fila tiene una huella (leaf) = SHA-256 de sus campos públicos en un orden fijo. Es el recibo.
   - Cada día se calcula la raíz de Merkle de todas las huellas del día, en orden de llegada.
   - Cada sello encadena el anterior: chain = SHA-256(prev | día | n | raíz). Cambiar una sola fila
     antigua cambia su raíz y rompe todos los sellos posteriores, que ya están publicados fuera. */
const crypto = require("crypto");

const GENESIS = "0".repeat(64);
const sha256hex = (s) => crypto.createHash("sha256").update(s).digest("hex");

/* Campos públicos de una fila, en el orden con el que se calcula la huella */
const PUBLIC_FIELDS = ["rid", "hour", "data_version", "region", "age", "sex", "vote23", "answers", "stars",
  "points", "blind", "prediction", "top", "affinity", "duration_s", "flags"];

function publicRow(row) {
  const o = {};
  for (const f of PUBLIC_FIELDS) {
    let v = row[f];
    if (f === "hour") v = new Date(v).toISOString();
    if (v === undefined) v = null;
    o[f] = v;
  }
  return o;
}

function leafOf(row) {
  const pr = publicRow(row);
  return sha256hex(JSON.stringify(PUBLIC_FIELDS.map((f) => pr[f])));
}

/* Nodo interno = SHA-256(0x01 ‖ izquierda ‖ derecha). Si un nivel es impar, el último sube tal cual. */
function hashPair(a, b) {
  return crypto.createHash("sha256").update(Buffer.concat([Buffer.from([1]), a, b])).digest();
}

function merkleRoot(leavesHex) {
  if (!leavesHex.length) return sha256hex("");
  let level = leavesHex.map((h) => Buffer.from(h, "hex"));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i]);
    level = next;
  }
  return level[0].toString("hex");
}

/* Prueba de inclusión: hermanos desde la hoja hasta la raíz. side = posición del hermano. */
function merkleProof(leavesHex, index) {
  const proof = [];
  let level = leavesHex.map((h) => Buffer.from(h, "hex"));
  let i = index;
  while (level.length > 1) {
    const sib = i % 2 === 0 ? i + 1 : i - 1;
    if (sib < level.length) proof.push({ side: i % 2 === 0 ? "R" : "L", hash: level[sib].toString("hex") });
    const next = [];
    for (let k = 0; k < level.length; k += 2) next.push(k + 1 < level.length ? hashPair(level[k], level[k + 1]) : level[k]);
    level = next; i = Math.floor(i / 2);
  }
  return proof;
}

function verifyProof(leafHex, proof, rootHex) {
  let h = Buffer.from(leafHex, "hex");
  for (const p of proof) {
    const s = Buffer.from(p.hash, "hex");
    h = p.side === "R" ? hashPair(h, s) : hashPair(s, h);
  }
  return h.toString("hex") === rootHex;
}

function chainOf(prev, day, n, root) { return sha256hex(`${prev}|${day}|${n}|${root}`); }

module.exports = { GENESIS, PUBLIC_FIELDS, publicRow, leafOf, merkleRoot, merkleProof, verifyProof, chainOf, sha256hex };
