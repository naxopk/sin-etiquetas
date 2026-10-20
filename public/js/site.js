/* Sin Etiquetas · cabecera y pie comunes a todas las páginas, y botón de GitHub con estrellas.
   Cada página marca cuál es con <body data-page="home|test|live|legal">. */
(function () {
  "use strict";
  var page = document.body.getAttribute("data-page") || "";
  // Logotipo: «Sin / Etiquetas» en dos líneas y la barra como seña de identidad
  var WORDMARK = '<span class="wm" aria-hidden="true"><span class="wm-t">Sin<br>Etiquetas</span>' +
    '<svg class="wm-slash" viewBox="0 0 16 34"><line x1="1.5" y1="32.5" x2="14.5" y2="1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>';
  var GH = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  var STAR = '<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 .25a.75.75 0 01.67.42l1.88 3.81 4.2.61a.75.75 0 01.42 1.28l-3.04 2.96.72 4.19a.75.75 0 01-1.09.79L8 12.33l-3.76 1.98a.75.75 0 01-1.09-.79l.72-4.19L.83 6.37a.75.75 0 01.42-1.28l4.2-.61L7.33.67A.75.75 0 018 .25z"/></svg>';
  var IG_URL = "https://www.instagram.com/votasinetiquetas.es/";
  var IG = '<svg class="ig-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none"/></svg>';
  var MENU = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var NAV = [["/", "Proyecto", "home"], ["/test/", "Test", "test"], ["/resultados/", "En directo", "live"]];

  var head = document.getElementById("site-header");
  if (head) {
    head.className = "top";
    head.innerHTML =
      '<div class="wrap wide top-in">' +
        '<a class="brand" href="/" aria-label="Sin Etiquetas, inicio">' + WORDMARK + "</a>" +
        '<nav class="main-nav" id="main-nav" aria-label="Secciones">' + NAV.map(function (n) {
          return '<a href="' + n[0] + '"' + (n[2] === page ? ' aria-current="page"' : "") + ">" + n[1] + "</a>";
        }).join("") + "</nav>" +
        '<div class="top-actions">' +
          '<a class="ig-btn" href="' + IG_URL + '" target="_blank" rel="noopener" aria-label="Síguenos en Instagram, @votasinetiquetas.es">' + IG + "</a>" +
          '<a class="gh" id="gh" href="https://github.com/naxopk/sin-etiquetas" target="_blank" rel="noopener" aria-label="Código abierto en GitHub">' + GH +
            '<span class="gh-l">' + STAR + "Star</span>" + '<span class="gh-n" id="ghStars" hidden></span></a>' +
          (page === "test" ? "" : '<a class="btn btn-sm top-cta" href="/test/">Haz el test</a>') +
          '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Abrir el menú">' + MENU + "</button>" +
        "</div>" +
      "</div>";
    var btn = head.querySelector(".menu-btn");
    btn.addEventListener("click", function () {
      var open = head.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Cerrar el menú" : "Abrir el menú");
    });
    head.querySelectorAll(".main-nav a").forEach(function (a) { a.addEventListener("click", function () { head.classList.remove("open"); }); });
  }

  var foot = document.getElementById("site-footer");
  if (foot) {
    foot.className = "site-foot";
    foot.innerHTML =
      '<div class="wrap wide foot-grid">' +
        '<div class="foot-brand"><a class="brand" href="/" aria-label="Sin Etiquetas, inicio">' + WORDMARK + "</a>" +
          "<p>Somos independientes: sin relación con ningún partido. Código y datos abiertos.</p><span>votasinetiquetas.es</span>" +
          '<a class="foot-ig" href="' + IG_URL + '" target="_blank" rel="noopener">' + IG + "Síguenos en Instagram</a></div>" +
        '<div><h4>El proyecto</h4><a href="/">Qué es</a><a href="/#por-quien">Por qué lo hacemos</a><a href="/#fiabilidad">Por qué fiarte</a><a href="/test/">Haz el test</a></div>' +
        '<div><h4>Datos</h4><a href="/resultados/">Resultados en directo</a><a href="/resultados/#d-int">Comprueba un recibo</a><a href="/api/dataset">Datos abiertos</a><a id="ghFoot" href="https://github.com/naxopk/sin-etiquetas" target="_blank" rel="noopener">Código en GitHub</a></div>' +
        '<div><h4>Legal</h4><a href="/privacidad/">Privacidad</a><span>Esto no es una encuesta ni una estimación de voto.</span></div>' +
      "</div>";
  }

  /* Origen de la visita (Instagram, TikTok…): solo sirve para sumar totales por día y origen.
     Se guarda en este navegador 30 días y, si envías tus respuestas, se suma aparte: nunca va junto a ellas. */
  var ORIGIN_KEY = "sinetiquetas-origen", ORIGIN_DAYS = 30;
  var REFS = [[/(^|\.)instagram\.com$/, "instagram"], [/(^|\.)facebook\.com$/, "facebook"], [/^(t\.co|(.+\.)?x\.com|(.+\.)?twitter\.com)$/, "x"],
    [/(^|\.)tiktok\.com$/, "tiktok"], [/(^|\.)threads\.(net|com)$/, "threads"], [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
    [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"], [/(^|\.)reddit\.com$/, "reddit"], [/(^|\.)bsky\.app$/, "bluesky"],
    [/(^|\.)(t\.me|telegram\.org)$/, "telegram"], [/(^|\.)whatsapp\.com$/, "whatsapp"],
    [/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|ecosia\.org)$/, "buscador"]];
  function readOrigin() {
    try {
      var o = JSON.parse(localStorage.getItem(ORIGIN_KEY));
      if (o && o.s && Date.now() - o.t < ORIGIN_DAYS * 86400000) return o;
    } catch (e) {}
    return null;
  }
  window.seOrigen = function () { var o = readOrigin(); return o ? { source: o.s, campaign: o.c } : null; };
  (function () {
    var q, src = "", camp = "";
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    src = (q.get("utm_source") || "").slice(0, 40);
    if (src) camp = (q.get("utm_campaign") || q.get("utm_medium") || "").slice(0, 60);
    else {
      // Sin parámetros: el navegador integrado de la app lo delata, o la página de la que vienes
      var ua = navigator.userAgent || "";
      if (/Instagram/i.test(ua)) src = "instagram";
      else if (/FBAN|FBAV|FB_IAB/.test(ua)) src = "facebook";
      else if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) src = "tiktok";
      else {
        var host = "";
        try { host = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
        if (host && host !== location.hostname) for (var i = 0; i < REFS.length; i++) if (REFS[i][0].test(host)) { src = REFS[i][1]; break; }
      }
      if (src) camp = "sin-utm";
    }
    // Quita los utm_ de la dirección: si alguien copia el enlace para compartirlo, no se lleva el origen
    if (q.get("utm_source") || q.get("utm_medium") || q.get("utm_campaign")) {
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) { q.delete(k); });
      try { history.replaceState(history.state, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); } catch (e) {}
    }
    if (!src) return;
    var prev = readOrigin();
    if (camp === "sin-utm" && prev && prev.s === src) camp = prev.c; // misma app al cambiar de página: conserva la campaña del enlace
    var today = new Date().toISOString().slice(0, 10), mark = today + "|" + src + "|" + camp;
    if (prev && prev.v === mark) return; // ya contada hoy
    try { localStorage.setItem(ORIGIN_KEY, JSON.stringify({ s: src, c: camp, t: Date.now(), v: mark })); } catch (e) { return; }
    var body = JSON.stringify({ source: src, campaign: camp });
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon("/api/origen", new Blob([body], { type: "application/json" }))))
        fetch("/api/origen", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
    } catch (e) {}
  })();

  function fmt(n) { return n >= 1000 ? (n / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " k" : String(n); }
  fetch("/api/github").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.url) return;
    var a = document.getElementById("gh"), f = document.getElementById("ghFoot");
    if (a) { a.href = j.url; a.hidden = false; }
    if (f) { f.href = j.url; f.hidden = false; }
    if (typeof j.stars === "number") {
      var b = document.getElementById("ghStars");
      if (b) { b.textContent = fmt(j.stars); b.hidden = false; a.setAttribute("aria-label", "Código abierto en GitHub, " + j.stars + " estrellas"); }
    }
  }).catch(function () {});
})();
