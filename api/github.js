"use strict";
/* GET /api/github · enlace al repositorio y número de estrellas.
   Se consulta a GitHub como mucho una vez por hora, para no gastar su límite de peticiones. */
const { CONFIG } = require("../lib/config");
const { send } = require("../lib/http");

let memo = { at: 0, stars: null };

module.exports = async (req, res) => {
  const url = CONFIG.REPO_URL;
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(url || "");
  if (!m) return send(res, 200, { url: null, stars: null }, "public, max-age=300");
  if (Date.now() - memo.at > 3600000) {
    try {
      const headers = { "User-Agent": "sin-etiquetas", Accept: "application/vnd.github+json" };
      if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      const r = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}`, { headers });
      if (r.ok) memo = { at: Date.now(), stars: (await r.json()).stargazers_count };
      else memo.at = Date.now() - 3300000; // reintenta en 5 minutos
    } catch (e) { memo.at = Date.now() - 3300000; }
  }
  send(res, 200, { url, stars: memo.stars }, "public, max-age=600, s-maxage=3600");
};
