"use strict";
/* Sellado nocturno para el VPS (lo lanza cron a las 00:10 UTC). Sella los días cerrados y limpia el límite de envíos. */
require("../lib/env").loadEnv();
const { db } = require("../lib/db");
const { sealPending } = require("../lib/sealing");

(async () => {
  const sealed = await sealPending(await db());
  console.log(sealed.length ? sealed.map((s) => `Sellado ${s.day}: ${s.n} respuestas · ${s.chain.slice(0, 16)}…`).join("\n") : "Nada que sellar.");
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
