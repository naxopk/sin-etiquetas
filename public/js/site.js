/* Sin Etiquetas · cabecera y pie comunes a todas las páginas, y botón de GitHub con estrellas.
   Cada página marca cuál es con <body data-page="home|test|live|legal">. */
(function () {
  "use strict";
  var page = document.body.getAttribute("data-page") || "";
  var LOGO = '<svg class="logo" width="30" height="30" viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="3" width="34" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M12 12 L28 28 M28 12 L12 28" stroke="var(--sepia)" stroke-width="5" stroke-linecap="round"/></svg>';
  var GH = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  var STAR = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 .25a.75.75 0 01.67.42l1.88 3.81 4.2.61a.75.75 0 01.42 1.28l-3.04 2.96.72 4.19a.75.75 0 01-1.09.79L8 12.33l-3.76 1.98a.75.75 0 01-1.09-.79l.72-4.19L.83 6.37a.75.75 0 01.42-1.28l4.2-.61L7.33.67A.75.75 0 018 .25z"/></svg>';
  var NAV = [["/", "Proyecto", "home"], ["/test/", "Test", "test"], ["/resultados/", "En directo", "live"]];

  var head = document.getElementById("site-header");
  if (head) {
    head.className = "top";
    head.innerHTML =
      '<div class="wrap wide top-in">' +
        '<a class="brand" href="/" aria-label="Sin Etiquetas, inicio">' + LOGO + '<div><b>Sin Etiquetas</b><span>votasinetiquetas.es</span></div></a>' +
        '<nav class="tabs main-nav" aria-label="Secciones">' + NAV.map(function (n) {
          return '<a href="' + n[0] + '"' + (n[2] === page ? ' aria-current="page"' : "") + ">" + n[1] + "</a>";
        }).join("") + "</nav>" +
        '<a class="gh" id="gh" href="https://github.com" target="_blank" rel="noopener" hidden aria-label="Código abierto en GitHub">' + GH +
          '<span class="gh-l">' + STAR + "Star</span>" + '<span class="gh-n" id="ghStars" hidden></span></a>' +
      "</div>";
  }

  var foot = document.getElementById("site-footer");
  if (foot) {
    foot.className = "site-foot";
    foot.innerHTML =
      '<div class="wrap wide foot-grid">' +
        '<div class="foot-brand"><a class="brand" href="/">' + LOGO + '<div><b>Sin Etiquetas</b><span>votasinetiquetas.es</span></div></a>' +
          "<p>Herramienta independiente, sin relación con ningún partido. Código y datos abiertos.</p></div>" +
        '<div><h4>El proyecto</h4><a href="/">Qué es</a><a href="/#fiabilidad">Por qué es fiable</a><a href="/test/">Hacer el test</a></div>' +
        '<div><h4>Datos</h4><a href="/resultados/">Resultados en directo</a><a href="/resultados/#d-int">Comprobar un recibo</a><a href="/api/dataset">Datos abiertos</a><a id="ghFoot" href="https://github.com" target="_blank" rel="noopener" hidden>Código en GitHub</a></div>' +
        '<div><h4>Legal</h4><a href="/privacidad/">Privacidad</a><span>Esto no es una encuesta ni una estimación de voto.</span></div>' +
      "</div>";
  }

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
