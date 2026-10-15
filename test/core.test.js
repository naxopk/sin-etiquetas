"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const SE = require("../public/js/shared.js");
const { rake, distribution } = require("../lib/weighting");
const { merkleRoot, merkleProof, verifyProof, leafOf, chainOf, GENESIS } = require("../lib/ledger");
const { buildRow } = require("../lib/submission");

const fullAnswers = (fn) => Object.fromEntries(SE.QUESTIONS.map((q, i) => [q.id, { v: fn(q, i), star: false }]));
const base = (extra = {}) => ({ consent: true, clientId: "a".repeat(24), region: "MAD", answers: fullAnswers((q, i) => (i % 5) - 2), points: { viv: 5 }, blind: { b1: 1 }, durationS: 600, ...extra });

test("un votante idéntico a cada partido sale con ese partido primero", () => {
  SE.PARTIES.forEach((p, i) => {
    const sc = SE.scoreAll(fullAnswers((q) => q.p[i] ?? 0), {});
    assert.equal(SE.topParty(sc.parties, "ND"), p.id);
  });
});

test("el servidor recalcula la afinidad e ignora lo que diga el navegador", () => {
  const row = buildRow(base({ top: "INVENTADO", affinity: [100] }));
  assert.equal(row.affinity.length, SE.PARTIES.length);
  assert.ok(SE.PARTIES.some((p) => p.id === row.top));
  assert.equal(row.flags.length, 0);
});

test("rechaza envíos mal formados", () => {
  assert.throws(() => buildRow(base({ consent: false })), /consentimiento/);
  assert.throws(() => buildRow(base({ region: "XX" })), /Comunidad/);
  assert.throws(() => buildRow(base({ answers: { q1: { v: 7 } } })), /rango/);
  assert.throws(() => buildRow(base({ answers: { q1: { v: 1 } } })), /al menos/);
  assert.throws(() => buildRow(base({ points: { eco: 5, viv: 5, terr: 5, inm: 5, soc: 1 } })), /más puntos/);
  assert.throws(() => buildRow(base({ age: "12-15" })), /edad/);
  assert.throws(() => buildRow(base({ clientId: "corto" })), /Identificador/);
});

test("marca las respuestas demasiado rápidas o todas iguales", () => {
  assert.deepEqual(buildRow(base({ durationS: 30 })).flags, ["rapida"]);
  assert.deepEqual(buildRow(base({ answers: fullAnswers(() => 2) })).flags, ["en_linea"]);
});

test("la huella cambia si cambia cualquier dato", () => {
  const row = buildRow(base());
  const altered = { ...row, answers: row.answers.map((v, i) => (i === 0 ? (v === 2 ? 1 : 2) : v)) };
  assert.notEqual(leafOf(row), leafOf(altered));
  assert.equal(leafOf(row), row.leaf);
});

test("las pruebas de Merkle verifican cada hoja y fallan con una hoja falsa", () => {
  for (const n of [1, 2, 3, 7, 16, 33]) {
    const leaves = Array.from({ length: n }, () => crypto.randomBytes(32).toString("hex"));
    const root = merkleRoot(leaves);
    leaves.forEach((l, i) => assert.ok(verifyProof(l, merkleProof(leaves, i), root), `n=${n} i=${i}`));
    assert.equal(verifyProof(crypto.randomBytes(32).toString("hex"), merkleProof(leaves, 0), root), n === 0);
  }
  assert.notEqual(chainOf(GENESIS, "2026-11-01", 3, "ab"), chainOf(GENESIS, "2026-11-01", 4, "ab"));
});

test("el raking corrige una muestra sesgada hacia los objetivos", () => {
  // Muestra: 80 % jóvenes y 80 % Madrid. Objetivo: 20 % jóvenes y 15 % Madrid.
  const cells = [
    { region: "MAD", age: "18-29", n: 640 }, { region: "MAD", age: "65+", n: 160 },
    { region: "AND", age: "18-29", n: 160 }, { region: "AND", age: "65+", n: 40 },
    { region: "AND", age: "nd", n: 100 },
  ];
  const margins = { region: { MAD: 0.15, AND: 0.85 }, age: { "18-29": 0.2, "65+": 0.8 } };
  const r = rake(cells, margins, { minKnown: 10, lo: 0.01, hi: 100 });
  assert.ok(r.applied && r.converged);
  const reg = distribution(cells, r.weights, "region"), age = distribution(cells, r.weights, "age");
  assert.ok(Math.abs(reg.MAD.weighted - 0.15) < 0.005, `Madrid ${reg.MAD.weighted}`);
  const known = age["18-29"].weighted + age["65+"].weighted;
  assert.ok(Math.abs(age["18-29"].weighted / known - 0.2) < 0.005, `jóvenes ${age["18-29"].weighted / known}`);
  assert.ok(r.neff < 1100 && r.neff > 0);
});

test("el recorte de pesos limita a cuánto cuenta una persona", () => {
  const cells = [{ region: "MAD", n: 990 }, { region: "AND", n: 10 }];
  const r = rake(cells, { region: { MAD: 0.5, AND: 0.5 } }, { minKnown: 10 });
  assert.ok(r.wmax <= 5 + 1e-9 && r.wmin >= 0.2 - 1e-9);
  assert.equal(r.converged, false); // con pesos limitados no puede cuadrar: se informa, no se oculta
});
