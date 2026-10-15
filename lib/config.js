"use strict";
/* Configuración del servidor. Lo sensible va en variables de entorno de Vercel, nunca en el código. */

const env = (k, d) => (process.env[k] === undefined || process.env[k] === "" ? d : process.env[k]);

const CONFIG = {
  // Ley electoral (LOREG art. 69): no se difunden resultados por partido en los cinco días previos
  // a la votación. Se ocultan desde el 24/11 a las 00:00 hasta el cierre de los colegios en Canarias.
  BLACKOUT_START: env("BLACKOUT_START", "2026-11-24T00:00:00+01:00"),
  POLLS_CLOSE: env("POLLS_CLOSE", "2026-11-29T21:00:00+01:00"),
  SHOW_PARTY_RESULTS: env("SHOW_PARTY_RESULTS", "true") !== "false",

  RATE_PER_HOUR: +env("RATE_PER_HOUR", 10),     // envíos por conexión y hora (las redes compartidas tienen margen)
  MIN_ANSWERED: 8,                              // menos respuestas: se rechaza
  MIN_SECONDS: +env("MIN_SECONDS", 90),         // menos tiempo: se guarda marcada como «rápida»
  MIN_FOR_WEIGHTED: +env("MIN_FOR_WEIGHTED", 300),
  MIN_KNOWN_PER_DIM: +env("MIN_KNOWN_PER_DIM", 100),

  PUBLISHER: env("PUBLISHER_NAME", "[Nombre del responsable]"),
  CONTACT: env("CONTACT_EMAIL", "[correo de contacto]"),
  REPO_URL: env("REPO_URL", ""),
  TURNSTILE_SITE_KEY: env("TURNSTILE_SITE_KEY", ""),
  TURNSTILE_SECRET: env("TURNSTILE_SECRET", ""),
  RATE_SECRET: env("RATE_SECRET", "cambia-esto-en-produccion"),
  CRON_SECRET: env("CRON_SECRET", ""),
};

function partyBlackout(now = new Date()) {
  if (!CONFIG.SHOW_PARTY_RESULTS) return { active: true, reason: "desactivado", until: null };
  const a = new Date(CONFIG.BLACKOUT_START), b = new Date(CONFIG.POLLS_CLOSE);
  if (now >= a && now < b) return { active: true, reason: "ley_electoral", until: b.toISOString() };
  return { active: false, reason: null, until: null };
}

module.exports = { CONFIG, partyBlackout };
