"use strict";
/* POST /api/submit · recibe un envío anónimo y devuelve el recibo */
const { db, hasDatabase } = require("../lib/db");
const { buildRow } = require("../lib/submission");
const { verifyTurnstile, clientIp, overRateLimit } = require("../lib/guard");
const { send, readBody } = require("../lib/http");

const COLS = ["rid", "client_id", "hour", "day", "data_version", "region", "age", "sex", "vote23", "answers", "stars",
  "points", "blind", "prediction", "top", "affinity", "duration_s", "flags", "leaf"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Usa POST" });
  if (!hasDatabase()) return send(res, 503, { error: "El envío de respuestas no está activado" });
  let body;
  try { body = await readBody(req); } catch (e) { return send(res, e.status || 400, { error: "Envío mal formado" }); }

  try {
    const human = await verifyTurnstile(body && body.token);
    if (!human.ok) return send(res, 403, { error: "No hemos podido comprobar que eres una persona. Recarga la página e inténtalo de nuevo." });

    const row = buildRow(body);
    const d = await db();
    if (await overRateLimit(d, clientIp(req))) {
      return send(res, 429, { error: "Se han recibido muchos envíos desde tu conexión en la última hora. Prueba más tarde." });
    }

    const placeholders = COLS.map((_, i) => `$${i + 1}`).join(", ");
    const inserted = await d.query(
      `insert into responses (${COLS.join(", ")}) values (${placeholders}) on conflict (client_id) do nothing returning id`,
      COLS.map((c) => row[c])
    );
    if (!inserted.length) return send(res, 409, { error: "Ya se enviaron respuestas desde este navegador." });

    return send(res, 201, { receipt: row.leaf, rid: row.rid, day: row.day, counted: row.flags.length === 0, flags: row.flags });
  } catch (e) {
    if (e.status === 400) return send(res, 400, { error: e.message });
    console.error("submit", e);
    return send(res, 500, { error: "Error interno. Inténtalo más tarde." });
  }
};
