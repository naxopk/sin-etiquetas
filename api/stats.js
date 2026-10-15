"use strict";
/* GET /api/stats · cifras del dashboard. La CDN de Vercel las guarda 30 segundos:
   aunque haya miles de visitas a la vez, la base de datos solo calcula unas dos veces por minuto. */
const { db, hasDatabase } = require("../lib/db");
const { buildStats } = require("../lib/stats");
const { send } = require("../lib/http");

let memo = { at: 0, body: null };

module.exports = async (req, res) => {
  if (!hasDatabase()) return send(res, 503, { error: "Todavía no se están recogiendo respuestas" });
  try {
    if (Date.now() - memo.at > 20000) memo = { at: Date.now(), body: await buildStats(await db()) };
    send(res, 200, memo.body, "public, s-maxage=30, stale-while-revalidate=60");
  } catch (e) {
    console.error("stats", e);
    send(res, 500, { error: "No se pudieron calcular las estadísticas" });
  }
};
