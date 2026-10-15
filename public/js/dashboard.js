/* Sin Etiquetas · dashboard público en directo (necesita /js/shared.js) */
"use strict";
const root = document.getElementById("db");
const tip = document.getElementById("tip");
const REFRESH_MS = 30000;
let STATS = null, CONF = null, mode = "weighted", lastOk = 0, showAuthors = false;

const pct1 = (x) => (x === null || x === undefined ? "—" : (x * 100).toLocaleString("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + " %");
const pct0 = (x) => (x === null || x === undefined ? "—" : Math.round(x * 100) + " %");
const num = (x) => (x === null || x === undefined ? "—" : Math.round(x).toLocaleString("es-ES"));
const pick = (o) => (o ? (mode === "weighted" && STATS.weighting.applied && o.weighted !== null ? o.weighted : o.raw) : null);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const REG = Object.fromEntries(SE.REGIONS);
const DEMO_LABEL = { age: Object.fromEntries(SE.DEMO.age), sex: Object.fromEntries(SE.DEMO.sex), vote23: Object.fromEntries(SE.DEMO.vote23), region: REG };
const DIM_NAME = { region: "Comunidad", age: "Edad", sex: "Sexo", vote23: "Voto en 2023" };

/* ---------- Tooltip compartido ---------- */
root.addEventListener("pointermove", (e) => {
  const t = e.target.closest("[data-tip]");
  if (!t) { tip.hidden = true; return; }
  tip.innerHTML = t.dataset.tip; tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  tip.style.left = x + "px"; tip.style.top = y + "px";
});
root.addEventListener("pointerleave", () => { tip.hidden = true; });

/* ---------- Piezas ---------- */
function hbar(label, value, opts = {}) {
  const { raw = null, sub = "", tipText = "", max = 1, strong = false } = opts;
  const w = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const rw = raw === null ? null : Math.max(0, Math.min(100, (raw / max) * 100));
  return `<div class="hb ${strong ? "strong" : ""}" data-tip="${esc(tipText || `${label}: ${pct1(value)}`)}">
    <span class="hb-l">${label}${sub ? `<small>${sub}</small>` : ""}</span>
    <span class="hb-t"><i style="width:${w}%"></i>${rw !== null && mode === "weighted" && STATS.weighting.applied ? `<b class="hb-raw" style="left:${rw}%"></b>` : ""}</span>
    <span class="hb-v">${opts.valueText || pct1(value)}</span>
  </div>`;
}

function hourChart(byHour) {
  // Rellena las horas vacías de las últimas 48
  const now = new Date(); now.setUTCMinutes(0, 0, 0);
  const map = Object.fromEntries(byHour.map((h) => [h.hour, h.n]));
  const pts = [];
  for (let k = 47; k >= 0; k--) { const t = new Date(now - k * 3600000).toISOString(); pts.push({ t, n: map[t] || 0 }); }
  const max = Math.max(1, ...pts.map((p) => p.n));
  const nice = Math.pow(10, Math.floor(Math.log10(max))); const top = Math.ceil(max / nice) * nice;
  const W = 720, H = 180, L = 40, R = 8, Tp = 10, B = 26, bw = (W - L - R) / pts.length;
  const y = (v) => Tp + (H - Tp - B) * (1 - v / top);
  const grid = [0, top / 2, top].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="ax">${num(v)}</text>`).join("");
  const bars = pts.map((p, i) => {
    const d = new Date(p.t); const lbl = d.toLocaleString("es-ES", { weekday: "short", hour: "2-digit", minute: "2-digit" });
    const h = Math.max(p.n ? 2 : 0, y(0) - y(p.n));
    return `<g data-tip="${esc(`${lbl}: <b>${num(p.n)}</b> respuestas`)}"><rect x="${L + i * bw}" y="${Tp}" width="${bw}" height="${H - Tp - B}" fill="transparent"/>${p.n ? `<rect x="${L + i * bw + 1}" y="${y(0) - h}" width="${Math.max(1, bw - 2)}" height="${h}" rx="2" class="bar"/>` : ""}</g>`;
  }).join("");
  const xl = pts.map((p, i) => {
    const d = new Date(p.t); if (d.getHours() % 12 !== 0) return "";
    return `<text x="${L + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle" class="ax">${d.toLocaleString("es-ES", { weekday: "short", hour: "2-digit" })}h</text>`;
  }).join("");
  return `<div class="db-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Respuestas por hora en las últimas 48 horas">${grid}${bars}${xl}</svg></div>`;
}

function section(id, title, sub, body) {
  return `<section class="section" id="${id}"><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ""}${body}</section>`;
}

/* ---------- Página ---------- */
function render() {
  const s = STATS;
  const W = s.weighting;
  const valid = s.participation.valid;
  const ageSec = Math.round((Date.now() - new Date(s.generatedAt)) / 1000);

  if (!valid) {
    root.innerHTML = `<section class="verdict"><p class="eyebrow">En directo</p><h1>Lo que responden quienes hacen el test</h1>
      <p class="summary">Todavía no hay respuestas. En cuanto alguien termine el test y decida enviar sus respuestas de forma anónima, aparecerán aquí.</p>
      <div class="row"><a class="btn" href="/test/">Hacer el test</a></div></section>`;
    return;
  }

  const weightedOn = mode === "weighted" && W.applied;
  const toggle = `<div class="seg" role="group" aria-label="Tipo de cifra">
      <button data-mode="weighted" aria-pressed="${mode === "weighted"}" ${W.applied ? "" : "disabled"}>Ponderado</button>
      <button data-mode="raw" aria-pressed="${mode === "raw" || !W.applied}">Sin ponderar</button></div>`;

  const hero = `<section class="verdict">
    <p class="eyebrow">${CONF && CONF.demo ? "Demostración · respuestas inventadas para enseñar cómo se verá" : `<span class="live" aria-hidden="true"></span>En directo · actualizado hace ${ageSec < 60 ? ageSec + " s" : Math.round(ageSec / 60) + " min"} · se renueva cada 30 s`}</p>
    <h1>Lo que responden quienes hacen el test</h1>
    <p class="summary">Esto <b>no es una encuesta ni una estimación de voto</b>: participa quien quiere, no una muestra elegida al azar. La ponderación corrige parte de ese sesgo, pero no todo. Cada cifra se puede ver ponderada o tal cual llegó, y todos los datos se pueden descargar y comprobar.</p>
    <div class="row">${toggle}${!W.applied ? `<span class="small muted">La ponderación se activa a partir de ${num(W.minimum)} respuestas válidas.</span>` : ""}</div>
    <div class="kpis">
      <div><b>${num(valid)}</b><span>respuestas válidas</span></div>
      <div><b>${num(s.participation.last24h)}</b><span>en las últimas 24 horas</span></div>
      <div><b>${num(s.participation.received - valid)}</b><span>descartadas por los filtros de calidad</span></div>
      <div><b>${W.applied ? num(W.neff) : "—"}</b><span>muestra efectiva tras ponderar</span></div>
    </div>
  </section>
  <nav class="jump" aria-label="En esta página"><span class="eyebrow">En esta página</span>${[["d-part", "Participación"], ["d-parties", "Partidos"], ["d-themes", "Temas"], ["d-q", "Preguntas"], ["d-blind", "A ciegas"], ["d-rep", "Representatividad"], ["d-int", "Verificar"], ["d-ficha", "Ficha técnica"], ["d-math", "Cómo se calcula"]].map(([id, l]) => `<button class="chip" data-j="${id}">${l}</button>`).join("")}</nav>`;

  const part = section("d-part", "Participación", "Respuestas válidas por hora en las últimas 48 horas, en tu hora local.", hourChart(s.participation.byHour));

  // Partidos
  let parties;
  if (s.blackout.active) {
    parties = section("d-parties", "Partidos", "", `<div class="callout"><b>Resultados por partido ocultos.</b> ${s.blackout.reason === "ley_electoral"
      ? `La ley electoral prohíbe difundir sondeos en los cinco días anteriores a la votación. Volverán a mostrarse el ${new Date(s.blackout.until).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}, cuando cierren los últimos colegios.`
      : "Quien gestiona esta web ha decidido no mostrarlos."} El resto de cifras siguen disponibles.</div>`);
  } else {
    const list = s.parties.slice().sort((a, b) => (pick(b.first) || 0) - (pick(a.first) || 0));
    const max = Math.max(0.05, ...list.map((p) => Math.max(pick(p.first) || 0, p.first.raw || 0)));
    const pred = s.prediction && s.prediction.n ? `<p class="small muted" style="margin-top:14px">De quienes dijeron a qué partido creían parecerse, <b>${pct0(pick(s.prediction.hit))}</b> acertó. Al resto, sus respuestas les acercaron a otro partido.</p>` : "";
    parties = section("d-parties", "¿Con qué partido coinciden más?",
      `Porcentaje de participantes cuyo partido más afín es cada uno. El margen (±) solo recoge el azar del muestreo, no el sesgo de quién participa. ERC, Junts, EH Bildu, PNV, BNG y CC solo se presentan en su comunidad, así que su porcentaje nacional es bajo por definición.`,
      `<div class="hbars">${list.map((p) => hbar(`${p.name}${p.regional ? ' <small class="muted">· autonómico</small>' : ""}`, pick(p.first), {
        raw: p.first.raw, max, valueText: `${pct1(pick(p.first))}${p.moe ? ` <small>±${(p.moe * 100).toFixed(1)}</small>` : ""}`,
        tipText: `<b>${esc(p.name)}</b><br>Primera opción: ${pct1(pick(p.first))}${weightedOn ? ` (sin ponderar ${pct1(p.first.raw)})` : ""}<br>Afinidad media: ${pct0(pick(p.affinity))}`,
      })).join("")}</div>${weightedOn ? legend() : ""}${pred}`);
  }

  // Temas
  const th = s.themes.slice().sort((a, b) => (pick(b) || 0) - (pick(a) || 0));
  const tmax = Math.max(1, ...th.map((t) => Math.max(pick(t) || 0, t.raw || 0)));
  const themes = section("d-themes", "¿Qué temas deciden su voto?", "Puntos medios que reciben los temas en el reparto inicial de 20 puntos.",
    `<div class="hbars">${th.map((t) => hbar(t.name, pick(t), { raw: t.raw, max: tmax, valueText: (pick(t) ?? 0).toLocaleString("es-ES", { maximumFractionDigits: 2, minimumFractionDigits: 2 }), tipText: `<b>${esc(t.name)}</b><br>${(pick(t) ?? 0).toFixed(2)} puntos de media` })).join("")}</div>${weightedOn ? legend() : ""}`);

  // Preguntas
  const qs = s.questions.map((q) => ({ ...q, a: pick(q.agree) || 0, d: pick(q.disagree) || 0 }));
  const consensus = qs.slice().sort((x, y) => Math.max(y.a, y.d) - Math.max(x.a, x.d)).slice(0, 5);
  const divided = qs.slice().sort((x, y) => Math.abs(x.a - x.d) - Math.abs(y.a - y.d) || (y.a + y.d) - (x.a + x.d)).slice(0, 5);
  const skipped = qs.slice().sort((x, y) => (y.skip || 0) - (x.skip || 0)).slice(0, 5);
  const split = (q) => `<div class="split" data-tip="${esc(`<b>${esc(q.short)}</b><br>A favor o B: ${pct0(q.a)} · En contra o A: ${pct0(q.d)} · Intermedio: ${pct0(1 - q.a - q.d)}`)}">
      <span class="split-l">${esc(q.short)}</span>
      <span class="split-bar"><i class="neg" style="width:${q.d * 100}%"></i><i class="mid" style="width:${Math.max(0, 1 - q.a - q.d) * 100}%"></i><i class="pos" style="width:${q.a * 100}%"></i></span>
      <span class="split-v">${pct0(q.d)} · ${pct0(q.a)}</span></div>`;
  const qtable = `<div class="scroll"><table class="heat"><thead><tr><th class="pt">Pregunta</th><th>En contra / A</th><th>Intermedio</th><th>A favor / B</th><th>Saltada</th><th>Decisiva</th></tr></thead><tbody>
    ${qs.map((q) => `<tr><td class="pt" style="white-space:normal;min-width:220px">${esc(q.short)}</td><td>${pct0(q.d)}</td><td>${pct0(1 - q.a - q.d)}</td><td>${pct0(q.a)}</td><td>${pct0(q.skip)}</td><td>${pct0(pick(q.decisive))}</td></tr>`).join("")}
  </tbody></table></div>`;
  const questions = section("d-q", "Lo que más une y lo que más divide", "En cada barra, a la izquierda quienes están en contra (o eligen la opción A) y a la derecha quienes están a favor (o eligen B).",
    `<div class="split-legend"><span><i class="neg"></i>En contra · A</span><span><i class="mid"></i>Intermedio</span><span><i class="pos"></i>A favor · B</span></div>
    <div class="twocol"><div><p class="eyebrow" style="margin-bottom:8px">Más consenso</p>${consensus.map(split).join("")}</div><div><p class="eyebrow" style="margin-bottom:8px">Más división</p>${divided.map(split).join("")}</div></div>
    <p class="eyebrow" style="margin:22px 0 8px">Las que más se saltan</p><p class="small muted" style="margin-bottom:8px">Si una pregunta se salta mucho, puede estar mal formulada o tratar un tema poco conocido.</p>
    ${skipped.map((q) => hbar(esc(q.short), q.skip, { max: Math.max(0.1, skipped[0].skip || 0), tipText: `${esc(q.short)}: la salta el ${pct1(q.skip)}` })).join("")}
    <details style="margin-top:18px"><summary class="small" style="cursor:pointer;font-weight:600">Ver las 36 preguntas</summary><div style="margin-top:12px">${qtable}</div></details>`);

  // A ciegas
  const blind = section("d-blind", "Propuestas a ciegas", "Apoyo a cada medida cuando nadie sabe quién la propone. La autoría está oculta para no estropear el test a quien aún no lo ha hecho.",
    `<label class="small" style="display:flex;gap:8px;align-items:center;margin-bottom:12px;cursor:pointer"><input type="checkbox" id="authors" ${showAuthors ? "checked" : ""}> Mostrar quién propuso cada medida</label>
    <div class="hbars">${s.blind.map((b) => { const meta = SE.BLIND.find((x) => x.id === b.id); return hbar(`${esc(meta.text)}${showAuthors ? `<small>${esc(meta.who)}</small>` : ""}`, pick(b.support), { raw: b.support.raw, tipText: `Apoyo ${pct1(pick(b.support))} · Rechazo ${pct1(pick(b.oppose))}` }); }).join("")}</div>${weightedOn ? legend() : ""}`);

  // Representatividad
  const regRows = s.regions.filter((r) => r.target !== null).sort((a, b) => b.target - a.target);
  const regMax = Math.max(0.2, ...regRows.map((r) => Math.max(r.sample || 0, r.target || 0)));
  const dimTable = (d) => `<div><p class="eyebrow" style="margin-bottom:6px">${DIM_NAME[d.dim]}${d.used ? "" : " · sin usar"}</p>
    ${d.skipped ? `<p class="small muted">${esc(d.skipped.reason)}.</p>` : ""}
    <div class="scroll"><table class="heat"><thead><tr><th class="pt">Categoría</th><th>Muestra</th><th>Censo</th><th>Ponderado</th></tr></thead><tbody>
    ${d.rows.map((r) => `<tr><td class="pt">${esc((DEMO_LABEL[d.dim] || {})[r.cat] || (r.cat === "nd" || r.cat === "ND" ? "Sin dato" : r.cat))}</td><td>${pct1(r.sample)}</td><td>${r.target === null ? "—" : pct1(r.target)}</td><td>${r.weighted === null ? "—" : pct1(r.weighted)}</td></tr>`).join("")}
    </tbody></table></div></div>`;
  const rep = section("d-rep", "¿Se parece la muestra a España?",
    `Peso de cada comunidad entre los participantes (barra) frente a su peso en el censo (marca vertical). Por encima de 1×, esa comunidad está sobrerrepresentada.${s.weighting.approximateMargins ? " <b>Aviso: los datos de censo que se usan ahora son aproximados.</b>" : ""}`,
    `<div class="hbars">${regRows.map((r) => `<div class="hb" data-tip="${esc(`<b>${esc(r.name)}</b><br>Participantes: ${pct1(r.sample)} (${num(r.n)})<br>Censo: ${pct1(r.target)}`)}"><span class="hb-l">${esc(r.name)}</span>
      <span class="hb-t"><i style="width:${(r.sample / regMax) * 100}%"></i><b class="hb-target" style="left:${(r.target / regMax) * 100}%"></b></span>
      <span class="hb-v">${r.ratio === null ? "—" : r.ratio.toLocaleString("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + "×"}</span></div>`).join("")}</div>
    <div class="legend"><span><i class="lg-bar"></i>Participantes</span><span><i class="lg-target"></i>Censo</span></div>
    <div class="wstats">
      <div><b>${W.applied ? num(W.neff) : "—"}</b><span>muestra efectiva (de ${num(valid)})</span></div>
      <div><b>${W.applied ? W.deff.toLocaleString("es-ES", { maximumFractionDigits: 2 }) : "—"}</b><span>efecto de diseño</span></div>
      <div><b>${W.applied ? `${W.wmin.toLocaleString("es-ES", { maximumFractionDigits: 2 })}–${W.wmax.toLocaleString("es-ES", { maximumFractionDigits: 2 })}` : "—"}</b><span>rango de pesos</span></div>
      <div><b>${W.applied ? pct0(W.trimmedShare) : "—"}</b><span>con peso recortado</span></div>
    </div>
    ${W.applied && !W.converged ? `<p class="callout" style="margin-top:12px"><b>La muestra está muy desequilibrada.</b> Sin dar pesos extremos no se puede igualar al censo: queda una desviación de hasta ${(W.maxDeviation * 100).toFixed(1)} puntos. Interpreta las cifras ponderadas con más cautela.</p>` : ""}
    <details style="margin-top:16px"><summary class="small" style="cursor:pointer;font-weight:600">Ver el ajuste por edad, sexo y voto en 2023</summary><div class="dimgrid">${W.dims.filter((d) => d.dim !== "region").map(dimTable).join("")}</div></details>`);

  // Integridad
  const seals = s.seals.length ? `<div class="scroll"><table class="heat"><thead><tr><th class="pt">Día</th><th>Respuestas</th><th>Raíz de Merkle</th><th>Sello encadenado</th></tr></thead><tbody>
      ${s.seals.map((x) => `<tr><td class="pt">${x.day}</td><td>${num(x.n)}</td><td class="mono" title="${x.merkle_root}">${x.merkle_root.slice(0, 16)}…</td><td class="mono" title="${x.chain}">${x.chain.slice(0, 16)}…</td></tr>`).join("")}
    </tbody></table></div>` : `<p class="small muted">El primer sello se crea la noche del primer día con respuestas.</p>`;
  const integ = section("d-int", "Comprueba que no hay trampas",
    "Cada respuesta recibe un recibo: su huella digital. Cada noche se sellan todas las huellas del día en una sola, encadenada con la del día anterior, y se publica fuera de esta web. Si alguien cambiara o borrara una sola respuesta, los sellos dejarían de cuadrar.",
    `<form id="rcform" class="rcform"><label for="rc" class="small" style="font-weight:600">Comprueba tu recibo</label>
      <div class="row"><input id="rc" name="rc" autocomplete="off" spellcheck="false" placeholder="Pega aquí los 64 caracteres de tu recibo"><button class="btn" type="submit">Comprobar</button></div>
      <p id="rcout" class="small" aria-live="polite"></p></form>
    <p class="eyebrow" style="margin:18px 0 8px">Últimos sellos</p>${seals}
    <p class="small muted" style="margin-top:12px">Datos abiertos: <a href="/api/dataset">lista de sellos</a> y filas de cada día en <code>/api/dataset?day=AAAA-MM-DD</code>.${CONF && CONF.repoUrl ? ` Copia independiente y código fuente en <a href="${esc(CONF.repoUrl)}" target="_blank" rel="noopener">GitHub</a>.` : ""}</p>`);

  // Ficha técnica
  const days = s.participation.byDay;
  const ficha = section("d-ficha", "Ficha técnica", "", `<dl class="kv ficha">
    <div><dt>Universo</dt><dd>Personas que han hecho el test en esta web y han aceptado enviar sus respuestas.</dd></div>
    <div><dt>Tipo de muestra</dt><dd>Autoseleccionada, no probabilística. No permite calcular un margen de error real.</dd></div>
    <div><dt>Tamaño</dt><dd>${num(valid)} respuestas válidas de ${num(s.participation.received)} recibidas.</dd></div>
    <div><dt>Fechas</dt><dd>${days.length ? `Del ${days[0].day} al ${days[days.length - 1].day}` : "—"}</dd></div>
    <div><dt>Ponderación</dt><dd>${W.applied ? `Raking por ${W.dims.filter((d) => d.used).map((d) => DIM_NAME[d.dim].toLowerCase()).join(", ")}. Pesos limitados entre 0,2 y 5.` : "Sin ponderar todavía."}</dd></div>
    <div><dt>Filtros</dt><dd>Se excluyen respuestas hechas en menos de 90 segundos o con casi todas las respuestas iguales. Antibots y límite de envíos por conexión.</dd></div>
    <div><dt>Responsable</dt><dd>${esc(CONF ? CONF.publisher : "—")}</dd></div>
    <div><dt>Versión de datos</dt><dd>Posiciones de los partidos del ${esc(s.dataVersion)}.</dd></div>
  </dl>`);

  const math = section("d-math", "Cómo se calcula", "", `<div class="prose">
    <p><b>1. Afinidad de cada persona.</b> Al terminar el test, el servidor vuelve a calcular la afinidad con cada partido con la misma fórmula que ve la persona, sin fiarse de lo que mande el navegador. El partido más afín es el que cuenta como su «primera opción».</p>
    <p><b>2. Filtros de calidad.</b> Las respuestas sospechosas no se borran: se guardan marcadas y no cuentan. Así cualquiera puede comprobar cuántas se excluyeron y por qué.</p>
    <p><b>3. Ponderación (raking).</b> Si entre los participantes hay el doble de jóvenes de los que hay en el censo, cada joven cuenta la mitad; si hay la mitad de mayores de 65, cada uno cuenta el doble. Se ajusta una variable cada vez (comunidad, edad, sexo y voto en 2023) y se repite hasta que todas cuadran a la vez con el censo y con los resultados oficiales de 2023. El voto en 2023 es la variable más importante, porque corrige que participe más gente de unos partidos que de otros.</p>
    <p><b>4. Recorte de pesos.</b> Nadie cuenta más de 5 veces ni menos de una quinta parte. Sin ese límite, unas pocas personas de grupos con poca participación decidirían el resultado.</p>
    <p><b>5. Muestra efectiva.</b> Ponderar tiene un coste: ${W.applied ? num(valid) : "N"} respuestas ponderadas aportan la misma precisión que ${W.applied ? num(W.neff) : "menos"} respuestas sin ponderar. Con esa cifra se calcula el margen (±), que solo mide el azar.</p>
    <p><b>Lo que la ponderación no arregla.</b> Si las personas que participan son distintas de las que no participan incluso teniendo la misma edad, sexo, comunidad y voto pasado (por ejemplo, más interesadas en política), ese sesgo sigue ahí. Por eso esto no es una encuesta.</p>
  </div>`);

  root.innerHTML = hero + part + parties + themes + questions + blind + rep + integ + ficha + math;
  wire();
}

function legend() {
  return `<div class="legend"><span><i class="lg-bar"></i>Ponderado</span><span><i class="lg-raw"></i>Sin ponderar</span></div>`;
}

function wire() {
  root.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => { if (b.disabled) return; mode = b.dataset.mode; try { localStorage.setItem("se-mode", mode); } catch (e) {} render(); });
  root.querySelectorAll("[data-j]").forEach((b) => b.onclick = () => document.getElementById(b.dataset.j).scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  const au = document.getElementById("authors"); if (au) au.onchange = () => { showAuthors = au.checked; render(); };
  const f = document.getElementById("rcform"); if (f) f.onsubmit = checkReceipt;
}

/* ---------- Comprobación de recibos en el navegador ---------- */
const hexToBytes = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
const bytesToHex = (b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
async function hashPair(a, b) { const buf = new Uint8Array(1 + a.length + b.length); buf[0] = 1; buf.set(a, 1); buf.set(b, 1 + a.length); return new Uint8Array(await crypto.subtle.digest("SHA-256", buf)); }
async function checkReceipt(e) {
  e.preventDefault();
  const out = document.getElementById("rcout");
  const r = document.getElementById("rc").value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(r)) { out.textContent = "El recibo son 64 caracteres (números y letras de la a a la f)."; return; }
  if (CONF && CONF.demo) { out.innerHTML = "<b>En la demostración no hay registro real.</b> En la web publicada, tu navegador comprobaría aquí la prueba criptográfica de tu recibo."; return; }
  out.textContent = "Comprobando…";
  try {
    const j = await (await fetch(`/api/receipt?r=${r}`)).json();
    if (!j.found) { out.innerHTML = "<b>No aparece en el registro.</b> Revisa que lo has copiado entero."; return; }
    if (!j.sealed) { out.innerHTML = `<b>Tu respuesta está registrada</b> (día ${j.day}). Esta noche se sellará y podrás comprobar la prueba criptográfica.`; return; }
    let h = hexToBytes(r);
    for (const p of j.proof) h = p.side === "R" ? await hashPair(h, hexToBytes(p.hash)) : await hashPair(hexToBytes(p.hash), h);
    const ok = bytesToHex(h) === j.seal.merkle_root;
    out.innerHTML = ok
      ? `<b>Verificado en tu navegador.</b> Tu respuesta es la n.º ${num(j.index + 1)} de ${num(j.n)} del ${j.day} y nadie la ha modificado. Sello del día: <span class="mono">${j.seal.chain.slice(0, 16)}</span>`
      : "<b>La prueba no cuadra.</b> Esto no debería pasar: avisa al responsable de la web.";
  } catch (err) { out.textContent = "No se ha podido comprobar ahora. Inténtalo más tarde."; }
}

/* ---------- Carga y refresco ---------- */
async function load() {
  try {
    if (!CONF) { try { CONF = await (await fetch("/api/config")).json(); } catch (e) { CONF = null; } }
    const r = await fetch("/api/stats");
    if (!r.ok) throw new Error(r.status);
    const keepScroll = scrollY;
    STATS = await r.json(); lastOk = Date.now();
    if (!STATS.weighting.applied) mode = "raw";
    render(); scrollTo(0, keepScroll);
  } catch (e) {
    if (!STATS) root.innerHTML = `<section class="verdict"><p class="eyebrow">En directo</p><h1>Lo que responden quienes hacen el test</h1><p class="summary">Los resultados no están disponibles ahora mismo. Vuelve a intentarlo en un rato.</p><div class="row"><a class="btn" href="/test/">Hacer el test</a></div></section>`;
  }
}
try { const m = localStorage.getItem("se-mode"); if (m === "raw" || m === "weighted") mode = m; } catch (e) {}
load();
setInterval(() => { if (!document.hidden && !document.activeElement?.closest?.("#rcform")) load(); }, REFRESH_MS);
