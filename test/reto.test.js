"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const SE = require("../public/js/shared.js");
const R = require("../public/js/reto.js");

const answers = (fn) => Object.fromEntries(SE.QUESTIONS.map((q, i) => [q.id, { v: fn(q, i), star: i % 4 === 0 }]));

test("«Compárate con un amigo»: el enlace guarda las respuestas y nada más", () => {
  const mine = answers((q, i) => (i % 7 === 0 ? null : (i % 5) - 2));
  const code = R.encode(mine);
  assert.match(code, /^[A-Za-z0-9_-]{20,30}$/, "corto y apto para una URL");
  const back = R.decode(code);
  SE.QUESTIONS.forEach((q) => assert.equal(back[q.id], mine[q.id].v));
  // Las mismas respuestas dan enlaces distintos: el código no se lee a simple vista ni se repite
  assert.notEqual(R.encode(mine, 1), R.encode(mine, 2));
  assert.equal(R.decode(code.slice(0, -1) + (code.endsWith("A") ? "B" : "A")), null, "un enlace roto no se acepta");
  assert.equal(R.decode("hola"), null);
});

test("la comparación sale de las preguntas que han respondido los dos", () => {
  const a = answers(() => 2), b = answers(() => -2), c = answers(() => 2);
  assert.equal(R.compare(a, R.decode(R.encode(c))).score, 1);
  assert.equal(R.compare(a, R.decode(R.encode(b))).score, 0);
  const few = answers((q, i) => (i < 5 ? 1 : null));
  assert.equal(R.compare(a, R.decode(R.encode(few))).enough, false, "con menos de 8 preguntas en común no hay resultado");
});
