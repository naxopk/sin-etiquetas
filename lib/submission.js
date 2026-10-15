"use strict";
/* Validación de un envío y construcción de la fila que se guarda.
   El servidor no se fía de nada de lo que calcula el navegador: recalcula la afinidad y el partido más afín. */
const crypto = require("crypto");
const SE = require("../public/js/shared.js");
const { CONFIG } = require("./config");
const { leafOf } = require("./ledger");

class InvalidSubmission extends Error {
  constructor(msg) { super(msg); this.status = 400; }
}
const fail = (m) => { throw new InvalidSubmission(m); };

const REGION_IDS = new Set(SE.REGIONS.map((r) => r[0]));
const PARTY_IDS = new Set(SE.PARTIES.map((p) => p.id));
const allowed = (list) => new Set(list.map((x) => x[0]));
const AGE = allowed(SE.DEMO.age), SEX = allowed(SE.DEMO.sex), VOTE = allowed(SE.DEMO.vote23);

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

function optional(value, set, name) {
  if (value === undefined || value === null || value === "") return null;
  if (!set.has(value)) fail(`Valor no válido en ${name}`);
  return value;
}

/* Comprueba la forma del envío y devuelve la fila lista para insertar */
function buildRow(body, now = new Date()) {
  if (!isObj(body)) fail("Envío vacío");
  if (body.consent !== true) fail("Falta el consentimiento");
  if (typeof body.clientId !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(body.clientId)) fail("Identificador no válido");
  if (!REGION_IDS.has(body.region)) fail("Comunidad no válida");

  const answersIn = isObj(body.answers) ? body.answers : fail("Faltan las respuestas");
  const answers = {}; let answered = 0;
  for (const q of SE.QUESTIONS) {
    const a = answersIn[q.id];
    if (a === undefined || a === null) continue;
    if (!isObj(a)) fail(`Respuesta mal formada en ${q.id}`);
    const v = a.v === null || a.v === undefined ? null : a.v;
    if (v !== null && !(Number.isInteger(v) && v >= -2 && v <= 2)) fail(`Valor fuera de rango en ${q.id}`);
    answers[q.id] = { v, star: a.star === true };
    if (v !== null) answered++;
  }
  for (const k of Object.keys(answersIn)) if (!SE.QMAP[k]) fail("Pregunta desconocida");
  if (answered < CONFIG.MIN_ANSWERED) fail(`Hacen falta al menos ${CONFIG.MIN_ANSWERED} respuestas`);

  const pointsIn = isObj(body.points) ? body.points : {};
  const points = {}; let used = 0;
  for (const t of SE.THEMES) {
    const v = pointsIn[t.id] === undefined ? 0 : pointsIn[t.id];
    if (!(Number.isInteger(v) && v >= 0 && v <= SE.MAXPTS)) fail("Puntos fuera de rango");
    points[t.id] = v; used += v;
  }
  if (used > SE.BUDGET) fail("Se han repartido más puntos de los permitidos");

  const blindIn = isObj(body.blind) ? body.blind : {};
  const blind = SE.BLIND.map((b) => {
    const v = blindIn[b.id];
    if (v === undefined || v === null) return null;
    if (![-1, 0, 1].includes(v)) fail("Valoración a ciegas no válida");
    return v;
  });

  let prediction = body.prediction === undefined ? null : body.prediction;
  if (prediction !== null && prediction !== "NS" && !PARTY_IDS.has(prediction)) fail("Predicción no válida");

  const age = optional(body.age, AGE, "edad");
  const sex = optional(body.sex, SEX, "sexo");
  const vote23 = optional(body.vote23, VOTE, "voto en 2023");

  let duration = Number.isFinite(body.durationS) ? Math.max(0, Math.round(body.durationS)) : null;
  if (duration !== null) duration = Math.min(Math.round(duration / 10) * 10, 86400 * 30);

  // Recalcular en el servidor con la misma fórmula del test
  const sc = SE.scoreAll(answers, points);
  const affinity = sc.parties.map((r) => Math.round(r.score * 100));
  const top = SE.topParty(sc.parties, body.region);

  // Filtros de calidad: la fila se guarda pero no cuenta en las estadísticas
  const flags = [];
  if (duration !== null && duration < CONFIG.MIN_SECONDS) flags.push("rapida");
  const vals = SE.QUESTIONS.map((q) => answers[q.id] ? answers[q.id].v : null).filter((v) => v !== null);
  if (vals.length >= 20) {
    const freq = {}; vals.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
    if (Math.max(...Object.values(freq)) / vals.length >= 0.9) flags.push("en_linea");
  }

  const hour = new Date(now); hour.setUTCMinutes(0, 0, 0);
  const row = {
    rid: crypto.randomBytes(12).toString("hex"),
    client_id: body.clientId,
    hour: hour.toISOString(),
    day: hour.toISOString().slice(0, 10),
    data_version: SE.DATA_VERSION,
    region: body.region, age, sex, vote23,
    answers: SE.QUESTIONS.map((q) => answers[q.id] ? answers[q.id].v : null),
    stars: SE.QUESTIONS.map((q) => !!(answers[q.id] && answers[q.id].star)),
    points: SE.THEMES.map((t) => points[t.id]),
    blind, prediction, top, affinity,
    duration_s: duration,
    flags,
  };
  row.leaf = leafOf(row);
  return row;
}

module.exports = { buildRow, InvalidSubmission };
