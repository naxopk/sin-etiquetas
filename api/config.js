"use strict";
/* GET /api/config · lo que el navegador necesita saber para mostrar el envío y el dashboard */
const { CONFIG, partyBlackout } = require("../lib/config");
const { hasDatabase } = require("../lib/db");
const { send } = require("../lib/http");

module.exports = async (req, res) => {
  send(res, 200, {
    submissions: hasDatabase(),
    turnstileSiteKey: CONFIG.TURNSTILE_SITE_KEY || null,
    blackout: partyBlackout(),
    publisher: CONFIG.PUBLISHER,
    contact: CONFIG.CONTACT,
    repoUrl: CONFIG.REPO_URL || null,
  }, "public, s-maxage=60");
};
