"use strict";
/* GET /api/cron/seal · lo llama Vercel Cron cada noche. Sella los días cerrados y limpia el límite de envíos. */
const { db } = require("../../lib/db");
const { sealPending } = require("../../lib/sealing");
const { CONFIG } = require("../../lib/config");
const { send } = require("../../lib/http");

module.exports = async (req, res) => {
  const auth = req.headers.authorization || "";
  if (!CONFIG.CRON_SECRET || auth !== `Bearer ${CONFIG.CRON_SECRET}`) return send(res, 401, { error: "No autorizado" });
  try {
    const sealed = await sealPending(await db());
    send(res, 200, { sealed });
  } catch (e) {
    console.error("seal", e);
    send(res, 500, { error: "No se pudo sellar" });
  }
};
