"use strict";
/* /api/origen · de dónde llega la gente, solo en totales por día.
   POST {source, campaign}: el navegador avisa una vez al día de que ha llegado desde un origen conocido.
   GET (con Authorization: Bearer CRON_SECRET): totales desde ?desde=AAAA-MM-DD (por defecto, los últimos 30 días). */
const { db, hasDatabase } = require("../lib/db");
const { countSource, sourceReport } = require("../lib/origen");
const { CONFIG } = require("../lib/config");
const { send, readBody, readQuery } = require("../lib/http");

module.exports = async (req, res) => {
  if (!hasDatabase()) return send(res, 503, { error: "No hay base de datos" });
  if (req.method === "GET") {
    const auth = req.headers.authorization || "";
    if (!CONFIG.CRON_SECRET || auth !== `Bearer ${CONFIG.CRON_SECRET}`) return send(res, 401, { error: "No autorizado" });
    const q = readQuery(req);
    const since = /^\d{4}-\d{2}-\d{2}$/.test(q.desde || "") ? q.desde : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    try { return send(res, 200, await sourceReport(await db(), since)); }
    catch (e) { console.error("origen", e); return send(res, 500, { error: "No se pudo leer" }); }
  }
  if (req.method !== "POST") return send(res, 405, { error: "Usa POST" });
  let body;
  try { body = await readBody(req); } catch (e) { return send(res, 400, { error: "Envío mal formado" }); }
  if (!body || typeof body.source !== "string" || !body.source) return send(res, 400, { error: "Falta el origen" });
  try {
    await countSource(await db(), "visits", body.source, body.campaign);
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error("origen", e);
    return send(res, 200, { ok: false }); // contar es secundario: nunca molesta a quien visita
  }
};
