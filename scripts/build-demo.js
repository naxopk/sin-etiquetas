"use strict";
/* Genera en demo/ una versión estática para enseñar el proyecto sin servidor:
   todas las páginas con enlaces relativos, el dashboard alimentado con respuestas inventadas
   y el envío desactivado. Uso: node scripts/build-demo.js [número de respuestas] */
process.env.DATABASE_URL = "pglite:memory://";
const fs = require("fs");
const path = require("path");
const { db, migrate } = require("../lib/db");
const { seedDb } = require("./seed");
const { buildStats } = require("../lib/stats");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "demo");
const N = +process.argv[2] || 1800;

const PAGES = { "index.html": "public/index.html", "test.html": "public/test/index.html", "resultados.html": "public/resultados/index.html", "privacidad.html": "public/privacidad/index.html" };
const ASSETS = ["css/sitio.css", "css/fuentes.css", "js/shared.js", "js/compartir.js", "js/app.js", "js/dashboard.js", "js/site.js", "favicon.svg", "img/logo.svg"];
const BINARY = ["img/og.png", "img/reel-r01.webp", "fonts/inter-latin.woff2", "fonts/inter-latin-ext.woff2", "fonts/caveat-latin.woff2", "fonts/caveat-latin-ext.woff2"];

const REWRITES = [
  ['"/css/', '"css/'], ['"/js/', '"js/'], ['"/img/', '"img/'],
  ['href="/resultados/#d-int"', 'href="resultados.html#d-int"'],
  ['href="/resultados/"', 'href="resultados.html"'],
  ['href="/privacidad/"', 'href="privacidad.html"'],
  ['href="/test/"', 'href="test.html"'],
  ['href="/"', 'href="index.html"'],
  ['fetch("/api/stats")', 'fetch("api/stats.json")'],
  ['fetch("/api/config")', 'fetch("api/config.json")'],
  ['fetch("/api/submit"', 'fetch("api/submit"'],
  ['fetch(`/api/receipt', 'fetch(`api/receipt'],
  ['<a href="/api/dataset">', '<a href="resultados.html#d-int">'],
  ['href="/api/dataset"', 'href="resultados.html#d-int"'],
  ['href="/#', 'href="index.html#'],
  ['href="/favicon.svg"', 'href="favicon.svg"'],
  ['href="/fonts/', 'href="fonts/'],
  ['fetch("/api/github")', 'fetch("api/github.json")'],
  ['[["/", "Proyecto", "home"], ["/test/", "Test", "test"], ["/resultados/", "En directo", "live"]]', '[["index.html", "Proyecto", "home"], ["test.html", "Test", "test"], ["resultados.html", "En directo", "live"]]'],
  ['" personas ya han sumado sus respuestas."', '" respuestas inventadas en esta demostración."'],
];
const BANNER = '<div class="demo-banner"><b>Demostración</b> · Los resultados usan respuestas inventadas y nada se envía a ningún sitio.</div>';

function rewrite(text) {
  for (const [a, b] of REWRITES) text = text.split(a).join(b);
  return text;
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, "css"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "js"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "api"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "img"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "fonts"), { recursive: true });

  for (const [dest, src] of Object.entries(PAGES)) {
    let html = rewrite(fs.readFileSync(path.join(ROOT, src), "utf8"));
    html = html.replace("<body>", "<body>\n" + BANNER);
    html = html.replace("</title>", '</title>\n<meta name="claude:viewport-fit-sides" content="cover">');
    if (dest === "index.html") {
      // La página principal de un Artifact se envuelve sola en <html>/<head>/<body>
      html = html.replace(/<!doctype html>\s*/i, "").replace(/<html[^>]*>\s*/, "").replace(/<\/?head>\s*/g, "")
        .replace(/<body>\s*/, "").replace(/<\/body>\s*/, "").replace(/<\/html>\s*/, "");
    }
    fs.writeFileSync(path.join(OUT, dest), html);
  }
  for (const a of ASSETS) fs.writeFileSync(path.join(OUT, a), rewrite(fs.readFileSync(path.join(ROOT, "public", a), "utf8")));
  for (const a of BINARY) fs.copyFileSync(path.join(ROOT, "public", a), path.join(OUT, a));
  // Ilustraciones de los reels que usa la web
  fs.mkdirSync(path.join(OUT, "img", "ilus"), { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, "public", "img", "ilus"))) fs.copyFileSync(path.join(ROOT, "public", "img", "ilus", f), path.join(OUT, "img", "ilus", f));
  fs.writeFileSync(path.join(OUT, "api", "github.json"), JSON.stringify({ url: "https://github.com/", stars: null }));

  await migrate();
  const d = await db();
  await seedDb(d, N);
  const stats = await buildStats(d);
  fs.writeFileSync(path.join(OUT, "api", "stats.json"), JSON.stringify(stats));
  fs.writeFileSync(path.join(OUT, "api", "config.json"), JSON.stringify({
    submissions: true, demo: true, turnstileSiteKey: null, blackout: { active: false },
    publisher: "[Nombre del responsable]", contact: "[correo de contacto]", repoUrl: null,
  }));

  // Ningún enlace absoluto debe quedar: en la demo no hay servidor
  const left = [];
  for (const f of [...Object.keys(PAGES), ...ASSETS]) {
    const t = fs.readFileSync(path.join(OUT, f), "utf8");
    const m = t.match(/(href|src)="\/[^/]|fetch\("\//g);
    if (m) left.push(`${f}: ${m.join(", ")}`);
  }
  if (left.length) { console.error("Quedan rutas absolutas:\n" + left.join("\n")); process.exit(1); }
  console.log(`Demo lista en demo/ con ${stats.participation.valid} respuestas válidas de ${N}.`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
