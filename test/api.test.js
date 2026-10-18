"use strict";
/* Prueba de punta a punta contra un Postgres real en memoria (pglite) */
process.env.DATABASE_URL = "pglite:memory://";
process.env.CRON_SECRET = "secreto-de-prueba";
process.env.RATE_PER_HOUR = "3";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("stream");
const SE = require("../public/js/shared.js");
const { db, migrate } = require("../lib/db");
const { verifyProof, leafOf, merkleRoot, chainOf, GENESIS } = require("../lib/ledger");
const { buildRow } = require("../lib/submission");
const { sealPending } = require("../lib/sealing");

function call(handler, { method = "GET", body, query = {}, headers = {} } = {}) {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  Object.assign(req, { method, query, headers: { "x-forwarded-for": "10.0.0.1", ...headers }, url: "/" });
  return new Promise((resolve) => {
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(s) { resolve({ status: this.statusCode, body: JSON.parse(s), headers: this.h }); } };
    handler(req, res);
  });
}
const answers = (fn) => Object.fromEntries(SE.QUESTIONS.map((q, i) => [q.id, { v: fn(q, i), star: i < 2 }]));
const payload = (id, extra = {}) => ({ consent: true, clientId: `cliente-de-prueba-${id}`.padEnd(20, "x"), region: "CAT", answers: answers((q, i) => ((i + id) % 5) - 2), points: { terr: 4 }, blind: { b2: -1 }, prediction: "ERC", durationS: 700, age: "30-44", ...extra });

test("flujo completo: envío, duplicado, límite, sello, recibo, datos y estadísticas", async () => {
  await migrate();
  const submit = require("../api/submit"), receipt = require("../api/receipt"), dataset = require("../api/dataset"), stats = require("../api/stats"), cron = require("../api/cron/seal");

  const r1 = await call(submit, { method: "POST", body: payload(1) });
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  assert.match(r1.body.receipt, /^[0-9a-f]{64}$/);
  assert.equal(r1.body.n, 1, "número de participante");

  const dup = await call(submit, { method: "POST", body: payload(1), headers: { "x-forwarded-for": "10.0.0.2" } });
  assert.equal(dup.status, 409);

  assert.equal((await call(submit, { method: "POST", body: payload(2) })).status, 201);
  const r3 = await call(submit, { method: "POST", body: payload(3) });
  assert.equal(r3.status, 201);
  assert.equal(r3.body.n, 3, "el tercer envío es el participante n.º 3");
  const limited = await call(submit, { method: "POST", body: payload(5) });
  assert.equal(limited.status, 429, "el cuarto envío desde la misma conexión en una hora se rechaza (límite 3)");

  const bad = await call(submit, { method: "POST", body: payload(4, { region: "NOPE" }), headers: { "x-forwarded-for": "10.0.0.9" } });
  assert.equal(bad.status, 400);

  // Recibo antes del sello: está, pero aún sin prueba
  let rc = await call(receipt, { query: { r: r1.body.receipt } });
  assert.equal(rc.body.found, true); assert.equal(rc.body.sealed, false);

  // Respuestas de ayer y sellado
  const d = await db();
  const yesterday = new Date(Date.now() - 86400000);
  const COLS = ["rid", "client_id", "hour", "day", "data_version", "region", "age", "sex", "vote23", "answers", "stars", "points", "blind", "prediction", "top", "affinity", "duration_s", "flags", "leaf"];
  const old = [];
  for (let k = 0; k < 5; k++) {
    const row = buildRow(payload(100 + k), yesterday); old.push(row);
    await d.query(`insert into responses (${COLS.join(",")}) values (${COLS.map((_, i) => "$" + (i + 1)).join(",")})`, COLS.map((c) => row[c]));
  }
  assert.equal((await call(cron, { headers: { authorization: "Bearer mal" } })).status, 401);
  const sealedRes = await call(cron, { headers: { authorization: "Bearer secreto-de-prueba" } });
  assert.equal(sealedRes.body.sealed.length, 1);
  const seal = sealedRes.body.sealed[0];
  assert.equal(seal.n, 5);
  assert.equal(seal.chain, chainOf(GENESIS, seal.day, 5, merkleRoot(old.map((r) => r.leaf))));
  assert.equal((await sealPending(d)).length, 0, "no se sella dos veces");

  // Recibo de ayer: prueba de Merkle válida
  rc = await call(receipt, { query: { r: old[3].leaf } });
  assert.equal(rc.body.sealed, true);
  assert.ok(verifyProof(old[3].leaf, rc.body.proof, rc.body.seal.merkle_root));

  // Datos abiertos: lo publicado reproduce las huellas y la raíz
  const ds = await call(dataset, { query: { day: seal.day } });
  assert.equal(ds.body.rows.length, 5);
  ds.body.rows.forEach((r) => assert.equal(leafOf(r), r.leaf));
  assert.equal(merkleRoot(ds.body.rows.map((r) => r.leaf)), seal.merkle_root);
  assert.equal(ds.body.rows[0].client_id, undefined, "el identificador del navegador no se publica");
  assert.equal((await call(dataset, { query: { day: new Date().toISOString().slice(0, 10) } })).status, 404);

  // Inmutabilidad
  await assert.rejects(d.query("update responses set region = 'MAD'"), /inmutable/);
  await assert.rejects(d.query("delete from seals"), /inmutable/);

  // Estadísticas
  const st = await call(stats);
  assert.equal(st.status, 200, JSON.stringify(st.body));
  assert.equal(st.body.participation.valid, 8);
  assert.equal(st.body.weighting.applied, false, "con pocas respuestas no se pondera");
  assert.equal(st.body.questions.length, 36);
  assert.ok(st.body.parties === null || st.body.parties.length === 12);
  assert.match(st.headers["cache-control"], /s-maxage=30/);
});
