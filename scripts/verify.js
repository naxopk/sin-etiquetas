"use strict";
/* Verificación independiente de los datos publicados. Cualquiera puede ejecutarla:
     node scripts/verify.js data/days
   Para cada día comprueba que (1) cada fila produce su huella, (2) las huellas producen la raíz de Merkle
   del sello, y (3) cada sello encadena con el del día anterior. Si algo no cuadra, termina con error. */
const fs = require("fs");
const path = require("path");
const { GENESIS, leafOf, merkleRoot, chainOf } = require("../lib/ledger");

function verifyDay(file, prev) {
  const { seal, rows } = JSON.parse(fs.readFileSync(file, "utf8"));
  const errors = [];
  rows.forEach((r, i) => { if (leafOf(r) !== r.leaf) errors.push(`fila ${i + 1}: la huella no coincide con los datos`); });
  if (rows.length !== seal.n) errors.push(`el sello dice ${seal.n} filas y hay ${rows.length}`);
  const root = merkleRoot(rows.map((r) => r.leaf));
  if (root !== seal.merkle_root) errors.push("la raíz de Merkle no coincide");
  if (prev !== null && seal.prev !== prev) errors.push("el sello no encadena con el día anterior");
  if (chainOf(seal.prev, seal.day, seal.n, seal.merkle_root) !== seal.chain) errors.push("el sello encadenado no coincide");
  return { seal, errors };
}

function verifyDir(dir) {
  const files = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  let prev = GENESIS, ok = true;
  for (const f of files) {
    const { seal, errors } = verifyDay(path.join(dir, f), prev);
    if (errors.length) { ok = false; console.log(`✗ ${seal.day}: ${errors.join("; ")}`); }
    else console.log(`✓ ${seal.day}: ${seal.n} respuestas · sello ${seal.chain.slice(0, 16)}…`);
    prev = seal.chain;
  }
  return { ok, days: files.length };
}

module.exports = { verifyDay, verifyDir };

if (require.main === module) {
  const dir = process.argv[2] || path.join(__dirname, "..", "data", "days");
  if (!fs.existsSync(dir)) { console.log("No hay datos publicados todavía."); process.exit(0); }
  const { ok, days } = verifyDir(dir);
  console.log(ok ? `Todo cuadra (${days} días).` : "HAY ERRORES: los datos publicados no coinciden con sus sellos.");
  process.exit(ok ? 0 : 1);
}
