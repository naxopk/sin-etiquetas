"use strict";
/* Rellena una base de datos LOCAL con respuestas inventadas para probar el dashboard.
   Se niega a ejecutarse contra una base de datos que no sea pglite. Uso: DATABASE_URL=pglite:./.pglite npm run seed -- 1500 */
const crypto = require("crypto");
const SE = require("../public/js/shared.js");
const { db, migrate } = require("../lib/db");
const { buildRow } = require("../lib/submission");
const { sealPending } = require("../lib/sealing");

const pick = (arr, wts) => { let r = Math.random() * wts.reduce((a, b) => a + b, 0); for (let i = 0; i < arr.length; i++) { r -= wts[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1]; };
const clamp = (v) => Math.max(-2, Math.min(2, Math.round(v)));

async function seedDb(d, N) {
  const COLS = ["rid", "client_id", "hour", "day", "data_version", "region", "age", "sex", "vote23", "answers", "stars", "points", "blind", "prediction", "top", "affinity", "duration_s", "flags", "leaf"];
  // Muestra sesgada a propósito: muchos jóvenes y mucho Madrid, para ver la ponderación en acción
  const regions = SE.REGIONS.filter((r) => r[0] !== "ND").map((r) => r[0]);
  const regW = regions.map((r) => (r === "MAD" ? 30 : r === "CAT" ? 14 : r === "AND" ? 10 : 3));
  for (let k = 0; k < N; k++) {
    const lean = Math.random() * 2 - 1; // de -1 (izquierda) a 1 (derecha), solo para generar datos plausibles
    const answers = {};
    SE.QUESTIONS.forEach((q) => {
      if (Math.random() < 0.07) return;
      // Interpola entre posiciones de partidos de referencia según la inclinación inventada
      const anchors = ["PODEMOS", "SUMAR", "PSOE", "PP", "VOX"].map((id) => q.p[SE.PIDX[id]] ?? 0);
      const x = (lean + 1) / 2 * (anchors.length - 1), k = Math.min(anchors.length - 2, Math.floor(x));
      const target = anchors[k] + (anchors[k + 1] - anchors[k]) * (x - k) + (Math.random() - 0.5) * 2.4;
      answers[q.id] = { v: clamp(target), star: Math.random() < 0.12 };
    });
    const points = {}; let left = 20;
    SE.THEMES.forEach((t) => { const v = Math.min(left, Math.floor(Math.random() * 4)); points[t.id] = v; left -= v; });
    const blind = {}; SE.BLIND.forEach((b) => { if (Math.random() < 0.9) blind[b.id] = pick([1, 0, -1], [5, 2, 3]); });
    const age = pick(["18-29", "30-44", "45-64", "65+", null], [30, 29, 25, 10, 6]);
    const vote23 = lean > 0.3 ? pick(["PP", "VOX", "NOVOTO", null], [6, 3, 2, 1]) : lean < -0.3 ? pick(["PSOE", "SUMAR", "NOVOTO", null], [5, 4, 2, 1]) : pick(["PSOE", "PP", "OTROS", "NOVOTO", null], [3, 3, 2, 3, 1]);
    const when = new Date(Date.now() - Math.random() * 3 * 86400000);
    const row = buildRow({
      consent: true, clientId: crypto.randomBytes(12).toString("hex"), region: pick(regions, regW), answers, points, blind,
      prediction: pick(["PP", "PSOE", "VOX", "SUMAR", "NS"], [3, 3, 2, 2, 2]), age, sex: pick(["F", "M", "O", null], [44, 50, 2, 4]), vote23,
      durationS: Math.random() < 0.04 ? 40 : 300 + Math.random() * 900,
    }, when);
    await d.query(`insert into responses (${COLS.join(", ")}) values (${COLS.map((_, i) => "$" + (i + 1)).join(", ")})`, COLS.map((c) => row[c]));
  }
  // Inserción desordenada por fecha: se reordena por id al sellar, como en producción
  return sealPending(d);
}

module.exports = { seedDb };

if (require.main === module) {
  if (!(process.env.DATABASE_URL || "").startsWith("pglite:")) { console.error("Solo para bases de datos locales (pglite)."); process.exit(1); }
  const N = +process.argv[2] || 1500;
  (async () => {
    await migrate();
    const sealed = await seedDb(await db(), N);
    console.log(`${N} respuestas de prueba. Días sellados: ${sealed.map((s) => s.day).join(", ") || "ninguno"}`);
    process.exit(0);
  })().catch((e) => { console.error(e); process.exit(1); });
}
