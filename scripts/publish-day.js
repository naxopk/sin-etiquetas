"use strict";
/* Descarga de la web los días sellados que aún no están en data/days y los guarda, tras verificarlos.
   Lo ejecuta cada noche la GitHub Action, pero cualquiera puede usarlo para tener su propia copia:
     node scripts/publish-day.js https://tu-dominio.es */
const fs = require("fs");
const path = require("path");
const { verifyDay } = require("./verify");
const { GENESIS } = require("../lib/ledger");

const site = (process.argv[2] || process.env.SITE_URL || "").replace(/\/$/, "");
if (!site) { console.error("Indica la dirección de la web: node scripts/publish-day.js https://…"); process.exit(1); }
const DAYS = path.join(__dirname, "..", "data", "days");
const SEALS = path.join(__dirname, "..", "data", "seals");

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

(async () => {
  fs.mkdirSync(DAYS, { recursive: true }); fs.mkdirSync(SEALS, { recursive: true });
  const { seals } = await get(`${site}/api/dataset`);
  let prev = GENESIS, added = 0;
  for (const s of seals) {
    const file = path.join(DAYS, `${s.day}.json`);
    if (!fs.existsSync(file)) {
      const first = await get(`${site}/api/dataset?day=${s.day}&page=0`);
      let rows = first.rows;
      for (let p = 1; p < first.pages; p++) rows = rows.concat((await get(`${site}/api/dataset?day=${s.day}&page=${p}`)).rows);
      const seal = { day: s.day, n: s.n, merkle_root: s.merkle_root, prev: s.prev, chain: s.chain };
      fs.writeFileSync(file, JSON.stringify({ seal, rows }) + "\n");
      const { errors } = verifyDay(file, prev);
      if (errors.length) { fs.unlinkSync(file); throw new Error(`${s.day}: ${errors.join("; ")}`); }
      fs.writeFileSync(path.join(SEALS, `${s.day}.json`), JSON.stringify(seal, null, 2) + "\n");
      console.log(`Añadido ${s.day}: ${rows.length} respuestas`); added++;
    }
    prev = s.chain;
  }
  console.log(added ? `${added} días nuevos.` : "Nada nuevo que publicar.");
})().catch((e) => { console.error(e.message); process.exit(1); });
