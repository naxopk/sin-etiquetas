"use strict";
/* Servidor HTTP propio: funciones /api y, opcionalmente, los archivos de /public.
   Lo usan el servidor de desarrollo (scripts/dev.js) y el de producción en el VPS (server.js). */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ROUTES = {
  "/api/submit": "../api/submit", "/api/stats": "../api/stats", "/api/receipt": "../api/receipt",
  "/api/dataset": "../api/dataset", "/api/config": "../api/config", "/api/github": "../api/github",
  "/api/cron/seal": "../api/cron/seal", "/api/origen": "../api/origen",
};
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};
const SECURITY = {
  "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

function createServer({ staticDir = null } = {}) {
  const handlers = Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [k, require(v)]));
  const staticRoot = staticDir ? path.resolve(ROOT, staticDir) : null;

  const server = http.createServer(async (req, res) => {
    for (const [k, v] of Object.entries(SECURITY)) res.setHeader(k, v);
    let url;
    try { url = new URL(req.url, "http://localhost"); } catch (e) { res.statusCode = 400; return res.end(); }
    const route = url.pathname.replace(/\/$/, "");

    if (route.startsWith("/api/")) {
      const h = handlers[route];
      if (!h) { res.statusCode = 404; res.setHeader("Content-Type", "application/json"); return res.end('{"error":"No existe"}'); }
      req.query = Object.fromEntries(url.searchParams.entries());
      try { await h(req, res); } catch (e) { console.error(e); if (!res.headersSent) { res.statusCode = 500; res.end(); } }
      return;
    }

    if (!staticRoot) { res.statusCode = 404; return res.end(); }
    let p = path.join(staticRoot, decodeURIComponent(url.pathname));
    if (!p.startsWith(staticRoot)) { res.statusCode = 403; return res.end(); }
    try {
      if (fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    } catch (e) { /* no existe: se comprueba abajo */ }
    if (!fs.existsSync(p)) { res.statusCode = 404; res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.end("No existe"); }
    const ext = path.extname(p);
    res.setHeader("Content-Type", TYPES[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", ext === ".html" ? "no-cache" : "public, max-age=300");
    fs.createReadStream(p).pipe(res);
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

module.exports = { createServer };
