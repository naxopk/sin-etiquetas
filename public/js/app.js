/* Sin Etiquetas · lógica del test (necesita /js/shared.js cargado antes) */
"use strict";
const X_SVG = '<svg viewBox="0 0 20 20" width="72%" height="72%" aria-hidden="true"><path d="M4.5 10.5 L8.5 14.5 L15.5 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const {REGIONS, PARTIES, PIDX, THEMES, TMAP, QUESTIONS, QMAP, BLIND, BUDGET, MAXPTS} = SE;
const axisParty = SE.axisParty;

/* Pausas: después de la pregunta con este índice (0-based) */
const PAUSES = {
 11:{title:"Llevas un tercio.", body:"Las doce siguientes vuelven a mezclar todos los temas. Si alguna te descoloca, recuerda que puedes saltarla.",
     fact:"El Congreso tiene 350 diputados, elegidos en 52 circunscripciones: las 50 provincias, Ceuta y Melilla. Para gobernar en solitario hacen falta 176.",
     tip:"Tus respuestas se guardan en este navegador. Puedes cerrar la página y seguir más tarde."},
 23:{title:"Dos tercios hechos.", body:"Quedan doce preguntas y nueve propuestas muy cortas. Después, el resultado.",
     fact:"Cada provincia elige al menos dos diputados y el resto se reparte por población: Madrid elige 38 y Soria 2. Por eso, en las provincias pequeñas, un partido pequeño necesita muchos más votos para sacar escaño.",
     tip:"Antes del resultado podrás repasar todas tus respuestas y cambiar las que quieras."}
};

const LIKERT = [[-2,"Muy en desacuerdo"],[-1,"En desacuerdo"],[0,"Ni a favor ni en contra"],[1,"De acuerdo"],[2,"Muy de acuerdo"]];
const DIL = [[-2,"Claramente A"],[-1,"Más bien A"],[0,"Las dos por igual"],[1,"Más bien B"],[2,"Claramente B"]];
/* ============================================================
   ESTADO
   ============================================================ */
const KEY = "sinetiquetas-29n-v1";
let view = "test";
let partyFilter = "all";
let S = load() || fresh();

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function makeOrder(){
  // Mezcla las preguntas evitando dos del mismo tema seguidas
  for(let tries=0; tries<200; tries++){
    const o = shuffle(QUESTIONS.map(q=>q.id));
    let ok = true;
    for(let i=1;i<o.length;i++){
      if(QMAP[o[i]].t===QMAP[o[i-1]].t){
        const k = o.findIndex((id,j)=> j>i && QMAP[id].t!==QMAP[o[i-1]].t && (j+1>=o.length || QMAP[o[j+1]].t!==QMAP[o[i]].t));
        if(k<0){ ok=false; break; }
        [o[i],o[k]]=[o[k],o[i]];
      }
    }
    if(ok) return o;
  }
  return shuffle(QUESTIONS.map(q=>q.id));
}
function fresh(){ return {stage:"intro", region:null, points:{}, answers:{}, order:makeOrder(), idx:0, blind:{}, bidx:0, prediction:null, pauses:{}, pauseAt:null, seenHelp:false, returnTo:null, completed:false, clientId:newClientId(), t0:null, durS:null, receipt:null}; }
function newClientId(){ try{ const b=new Uint8Array(24); crypto.getRandomValues(b); return Array.from(b,x=>x.toString(16).padStart(2,"0")).join(""); }catch(e){ return (Date.now().toString(16)+Math.random().toString(16).slice(2)).padEnd(32,"0").slice(0,48); } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
function load(){
  try{
    const s = JSON.parse(localStorage.getItem(KEY));
    if(s && Array.isArray(s.order) && s.order.length===QUESTIONS.length && s.order.every(id=>QMAP[id])) return s;
  }catch(e){}
  return null;
}
function hasProgress(){ return S.stage!=="intro" || Object.keys(S.answers).length>0; }
function eligible(p){ return !p.where || !S.region || S.region==="ND" || p.where.includes(S.region); }
function regionName(id){ const r=REGIONS.find(r=>r[0]===id); return r? r[1] : ""; }
function answeredCount(){ return QUESTIONS.filter(q=>S.answers[q.id] && typeof S.answers[q.id].v==="number").length; }

/* ============================================================
   CÁLCULO
   ============================================================ */
function compute(){
  const sc = SE.scoreAll(S.answers, S.points);
  const parties = sc.parties.map(r=>Object.assign({}, r, {p:PARTIES[r.i], elig: eligible(PARTIES[r.i])}));
  const ranked = parties.filter(r=>r.elig).sort((a,b)=>b.score-a.score);
  const others = parties.filter(r=>!r.elig).sort((a,b)=>b.score-a.score);
  return {ans: sc.ans, tw: sc.tw, parties, ranked, others, totalW: sc.totalW};
}
function axisUser(ans, ax){
  const xs = ans.filter(a=>a.q.ax===ax);
  if(!xs.length) return null;
  return xs.reduce((s,a)=>s+a.v*a.q.sg,0)/xs.length/2;
}

/* ============================================================
   TEXTO
   ============================================================ */
function stance(q, v){
  if(v===null || v===undefined) return "Sin posición clara";
  if(q.f==="l") return ({"-2":"Muy en contra","-1":"En contra","0":"Neutral o ambigua","1":"A favor","2":"Muy a favor"})[v];
  if(v===0) return "Equilibrio entre ambas";
  const side = v<0 ? q.aS : q.bS;
  return (Math.abs(v)===2 ? "Claramente: " : "Más bien: ") + side;
}
function youStance(q, v){
  if(q.f==="l") return ({"-2":"Muy en desacuerdo","-1":"En desacuerdo","0":"Ni a favor ni en contra","1":"De acuerdo","2":"Muy de acuerdo"})[v];
  return stance(q, v);
}
function code(q, v){
  if(v===null || v===undefined) return "?";
  if(q.f==="l") return ({"-2":"−−","-1":"−","0":"·","1":"+","2":"++"})[v];
  return ({"-2":"A+","-1":"A","0":"=","1":"B","2":"B+"})[v];
}
const pct = x => Math.round(x*100);
const lcName = t => t.lc || t.name.charAt(0).toLowerCase()+t.name.slice(1);
const pname = r => r.p.name;
function listJoin(arr){ if(arr.length<=1) return arr.join(""); return arr.slice(0,-1).join(", ")+" y "+arr[arr.length-1]; }

/* ============================================================
   RENDER
   ============================================================ */
const app = document.getElementById("app");
function setView(v){
  view = v;
  document.querySelectorAll("nav.tabs button").forEach(b=> b.setAttribute("aria-current", b.dataset.view===v ? "page" : "false"));
  app.classList.toggle("wide", v!=="test" || S.stage==="results");
  render();
  window.scrollTo({top:0});
}
function go(stage){
  if(stage==="q" && !S.t0) S.t0 = Date.now();
  if(stage==="results" && !S.durS && S.t0) S.durS = Math.round((Date.now()-S.t0)/1000);
  S.stage=stage; save(); app.classList.toggle("wide", view!=="test" || stage==="results"); render(); window.scrollTo({top:0}); }

function render(){
  if(view==="partidos") return renderParties();
  if(view==="metodo") return renderMethod();
  const fn = ({intro:renderIntro, region:renderRegion, priorities:renderPriorities, q:renderQ, pause:renderPause, review:renderReview, blindintro:renderBlindIntro, blind:renderBlind, predict:renderPredict, results:renderResults})[S.stage];
  (fn || renderIntro)();
}

function renderIntro(){
  const prog = hasProgress();
  const done = answeredCount();
  app.innerHTML = `
  <section class="hero hero-card tone-yel rays">
    <img class="stk bob test-runner" src="/img/ilus/runner_a.webp" alt="" width="640" height="640">
    <p class="eyebrow">Elecciones generales · domingo 29 de noviembre de 2026</p>
    <h1>Vota por lo que piensas, <em class="mk white">no por quién lo dice.</em></h1>
    <p class="lede">Respondes a medidas concretas sin ver siglas ni nombres. Al final te explicamos con qué partido coincides más, en qué, en qué no, y quién gana en los temas que más te importan.</p>
    <div class="row">
      ${prog ? `<button class="btn" id="cont">${S.completed ? "Ver mi resultado" : `Continuar donde lo dejaste (${done} de ${QUESTIONS.length})`}</button><button class="btn ghost" id="restart">Empezar de cero</button>`
             : `<button class="btn" id="start">Empezar el test</button><button class="btn link" id="toParties">Ver antes los partidos</button>`}
    </div>
    <p class="small muted">Unos 15 minutos · sin registrarte · tus respuestas no salen de tu navegador</p>
  </section>
  <section class="section">
    <h2>El recorrido</h2>
    <p class="sub">Cuatro pasos. Puedes volver atrás en cualquier momento y repasar todo antes del resultado.</p>
    <ol class="steps">
      <li><b>Dónde votas</b><span>10 segundos</span><p>Para compararte solo con los partidos de tu papeleta.</p></li>
      <li><b>Qué te importa</b><span>1 minuto</span><p>Repartes 20 puntos entre 10 temas. Lo que más pese en tu voto pesará más en el resultado.</p></li>
      <li><b>36 preguntas</b><span>10 a 12 minutos</span><p>Medidas y dilemas con contexto y argumentos de los dos lados. Con dos pausas por el camino.</p></li>
      <li><b>9 propuestas a ciegas</b><span>2 minutos</span><p>Medidas reales sin firma. Al final descubres de quién eran.</p></li>
    </ol>
  </section>
  <section class="section">
    <h2>Qué te llevas al final</h2>
    <ul class="gets">
      <li>El partido más cercano a ti, con las razones concretas.</li>
      <li>Las cuestiones en las que ese partido no piensa como tú.</li>
      <li>Si dudas entre dos, lo que de verdad los separa.</li>
      <li>Quién se acerca más a ti en cada uno de tus temas prioritarios.</li>
      <li>Tu posición en economía, valores y territorio.</li>
      <li>Si tus respuestas confirman o contradicen tu intuición.</li>
    </ul>
  </section>
  <section class="section" style="border-bottom:0">
    <h2>Por qué no es un test más</h2>
    <p class="sub">Si tienes una ideología muy definida, es fácil responder por instinto de equipo. El test está construido para que eso no pase.</p>
    <div class="rules">
      ${[
        ["Sin siglas ni etiquetas","Ninguna pregunta nombra un partido ni usa palabras como «izquierda», «derecha», «progresista» o «facha»."],
        ["Cada medida con su coste","Las afirmaciones incluyen su precio («aunque suponga…»). Así no basta con estar a favor de lo bonito."],
        ["Estar de acuerdo no siempre lleva al mismo lado","Unas veces aceptar una frase te acerca a un bloque y otras al contrario. No hay un patrón que seguir."],
        ["Dilemas, no solo opiniones","En muchas preguntas eliges entre dos opciones razonables, como haces cuando gobiernas con un presupuesto limitado."],
        ["Propuestas a ciegas","Al final valoras nueve medidas reales sin saber de quién son. Después te enseñamos su autor."],
        ["Primero decides qué te importa","Antes de empezar repartes puntos entre los temas. Pesan lo que tú digas, no lo que diga el último telediario."]
      ].map(([h,p])=>`<div><span class="xmark">${X_SVG}</span><div><h3>${h}</h3><p>${p}</p></div></div>`).join("")}
    </div>
  </section>
  <div class="notice"><b>Antes de empezar:</b> los partidos aún no han presentado sus programas para el 29N. Las posiciones salen de sus programas de 2023, de lo que han votado en el Congreso y de lo que han defendido públicamente hasta octubre de 2026. <a href="#metodo" id="toMethod">Así se han codificado</a>.</div>`;
  const on = (id,fn)=>{ const el=document.getElementById(id); if(el) el.onclick=fn; };
  on("start", ()=>go("region"));
  on("cont", ()=>go(S.stage==="intro" ? "region" : S.stage));
  on("restart", ()=>{ S=fresh(); save(); go("region"); });
  on("toParties", ()=>setView("partidos"));
  on("toMethod", e=>{ e.preventDefault(); setView("metodo"); });
}

function renderRegion(){
  app.innerHTML = `
  <div class="stagehead">
    <p class="eyebrow">Paso 1 de 4 · Dónde votas</p>
    <h2>¿En qué comunidad votas?</h2>
    <p>Algunos partidos solo se presentan en su comunidad, como ERC y Junts en Cataluña o el BNG en Galicia. Así te comparamos solo con las papeletas que vas a encontrar. No pedimos nada más sobre ti.</p>
  </div>
  <div class="regions">${REGIONS.map(([id,n])=>`<button class="choice" data-r="${id}" aria-pressed="${S.region===id}"><span class="box">${X_SVG}</span>${n}</button>`).join("")}</div>
  <div class="qnav"><button class="btn link" id="back">← Volver</button><button class="btn" id="next" ${S.region?"":"disabled"}>Siguiente</button></div>`;
  app.querySelectorAll("[data-r]").forEach(b=> b.onclick=()=>{ S.region=b.dataset.r; save(); renderRegion(); });
  document.getElementById("back").onclick=()=>go("intro");
  document.getElementById("next").onclick=()=>{ if(S.region) go("priorities"); };
}

function renderPriorities(){
  const used = THEMES.reduce((s,t)=>s+(S.points[t.id]||0),0);
  const left = BUDGET-used;
  const topT = THEMES.filter(t=>(S.points[t.id]||0)>0).sort((a,b)=>(S.points[b.id]||0)-(S.points[a.id]||0)).slice(0,3);
  const status = used===0 ? "Empieza por el tema que más te preocupa."
    : left===0 ? "Has repartido todos los puntos. Para subir un tema, quítale alguno a otro."
    : `Tus prioridades por ahora: ${listJoin(topT.map(t=>`${lcName(t)} (${S.points[t.id]})`))}.`;
  app.innerHTML = `
  <div class="stagehead">
    <p class="eyebrow">Paso 2 de 4 · Lo que te importa</p>
    <h2>¿Qué temas decidirían tu voto?</h2>
    <p>Tienes ${BUDGET} puntos para repartir entre 10 temas, como un presupuesto: lo que das a uno no puedes dárselo a otro. Así el resultado refleja lo que de verdad te importa, y no el tema que más ruido hace esta semana.</p>
    <p class="small">Máximo ${MAXPTS} por tema. Un tema con 0 puntos sigue contando, pero poco. Si no quieres decidirlo ahora, pulsa «Todos igual».</p>
  </div>
  <div class="budget"><b>${left}</b><span class="muted">de ${BUDGET} puntos por repartir</span>
    <button class="btn link" id="equal">Todos igual</button><button class="btn link" id="clear">Borrar</button></div>
  <p class="small muted" style="margin:-6px 0 12px" aria-live="polite">${status}</p>
  <div class="prio">${THEMES.map(t=>{
    const v=S.points[t.id]||0;
    return `<div class="item"><div><h3>${t.name}</h3><p>${t.d}</p></div>
      <div class="stepper"><button data-m="${t.id}" aria-label="Quitar un punto a ${t.name}" ${v<=0?"disabled":""}>−</button>
      <div class="pips" aria-label="${v} puntos">${Array.from({length:MAXPTS},(_,i)=>`<i class="${i<v?"on":""}"></i>`).join("")}</div>
      <button data-p="${t.id}" aria-label="Añadir un punto a ${t.name}" ${v>=MAXPTS||left<=0?"disabled":""}>+</button></div></div>`;
  }).join("")}</div>
  <div class="qnav"><button class="btn link" id="back">← Volver</button>
    <button class="btn" id="next">${used===0?"Seguir sin prioridades":left>0?`Seguir (sobran ${left} puntos)`:"Empezar las preguntas"}</button></div>`;
  app.querySelectorAll("[data-p]").forEach(b=> b.onclick=()=>{ const id=b.dataset.p; S.points[id]=Math.min(MAXPTS,(S.points[id]||0)+1); save(); renderPriorities(); });
  app.querySelectorAll("[data-m]").forEach(b=> b.onclick=()=>{ const id=b.dataset.m; S.points[id]=Math.max(0,(S.points[id]||0)-1); save(); renderPriorities(); });
  document.getElementById("equal").onclick=()=>{ THEMES.forEach(t=>S.points[t.id]=2); save(); renderPriorities(); };
  document.getElementById("clear").onclick=()=>{ S.points={}; save(); renderPriorities(); };
  document.getElementById("back").onclick=()=>go("region");
  document.getElementById("next").onclick=()=>go("q");
}

let advanceTimer = null;
const SECS_PER_Q = 20;
function helpBox(){
  return `<div class="help" id="helpbox">
    <h3>Cómo responder</h3>
    <ul>
      <li><b>Juzga la medida, no a quien crees que la propone.</b> Si una frase te suena «de los otros», léela otra vez como si la dijera alguien de tu confianza.</li>
      <li><b>«Ni a favor ni en contra» cuenta</b> como posición intermedia. Si no conoces el tema o te da igual, <b>sáltalo</b>: así no cuenta.</li>
      <li><b>Marca «Decisiva» antes de responder</b> si esa cuestión podría cambiar tu voto. Pesa el doble, así que úsala con moderación.</li>
      <li><b>¿Dudas?</b> Lee «Para situarte» y despliega los argumentos de los dos lados.</li>
    </ul>
    <button class="btn" id="gotit">Entendido</button>
  </div>`;
}
function progressBar(frac){
  const N = S.order.length;
  return `<div class="progress" aria-hidden="true"><div style="width:${(frac*100).toFixed(1)}%"></div>${Object.keys(PAUSES).map(k=>`<span class="tick" style="left:${((+k+1)/N*100).toFixed(2)}%"></span>`).join("")}</div>`;
}
function renderQ(){
  const N = S.order.length;
  if(S.idx>=N) S.idx=N-1;
  const q = QMAP[S.order[S.idx]];
  const a = S.answers[q.id] || {};
  const opts = q.f==="l" ? LIKERT : DIL;
  const editing = S.returnTo==="review";
  const mins = Math.max(1, Math.round(((N-S.idx)*SECS_PER_Q + BLIND.length*10)/60));
  app.innerHTML = `
  ${progressBar(S.idx/N)}
  <div class="qmeta">
    <span class="eyebrow">Pregunta ${S.idx+1} de ${N} · ${editing ? "cambiando respuesta" : `quedan unos ${mins} min`}</span>
    <span class="row" style="gap:10px"><span class="eyebrow">${TMAP[q.t].name}</span>${S.seenHelp?`<button class="btn link small" id="help" style="padding:0">¿Cómo respondo?</button>`:""}</span>
  </div>
  ${S.seenHelp ? "" : helpBox()}
  <article class="sheet qsheet">
    ${q.f==="d"
      ? `<p class="qlead">${q.text}</p><p class="hint">Las dos opciones son defendibles. Marca hacia cuál te inclinas y cuánto.</p><div class="poles"><div class="pole"><span class="tag">A</span><p>${q.a}</p></div><div class="pole"><span class="tag">B</span><p>${q.b}</p></div></div>`
      : `<p class="qtext">${q.text}</p>`}
    ${q.ctx ? `<div class="ctx"><span class="eyebrow">Para situarte</span><p>${q.ctx}</p></div>` : ""}
    <div class="qtools">
      <button class="star" id="star" aria-pressed="${!!a.star}" title="Pesa el doble en el resultado"><span class="box">${X_SVG}</span>Decisiva para mí · cuenta el doble</button>
    </div>
    <div class="opts" role="group" aria-label="Tu respuesta">
      ${opts.map(([v,l])=>`<button class="opt" data-v="${v}" aria-pressed="${a.v===v}"><span class="box">${X_SVG}</span><span>${l}</span></button>`).join("")}
    </div>
    <details class="args"><summary>Ver el mejor argumento de cada lado</summary>
      <div class="argsgrid"><div><h4>${q.f==="d"?"Argumento para A":"A favor"}</h4><p>${q.pro}</p></div><div><h4>${q.f==="d"?"Argumento para B":"En contra"}</h4><p>${q.con}</p></div></div>
    </details>
  </article>
  <div class="qnav">
    <button class="btn link" id="prev">← ${S.idx===0?"Prioridades":"Anterior"}</button>
    <div class="row">${editing?`<button class="btn link" id="toReview">Volver al repaso</button>`:""}<button class="btn ghost" id="skip">${typeof a.v==="number" ? "Siguiente →" : "Saltar, no tengo opinión →"}</button></div>
  </div>
  <p class="keyhint">Atajos: teclas 1 a 5 para responder, flechas para moverte.</p>`;
  app.querySelectorAll(".opt").forEach(b=> b.onclick=()=>answer(q, +b.dataset.v));
  document.getElementById("star").onclick=()=>{ const cur=S.answers[q.id]||{v:null}; cur.star=!cur.star; S.answers[q.id]=cur; save(); document.getElementById("star").setAttribute("aria-pressed", String(!!cur.star)); };
  document.getElementById("prev").onclick=prevQ;
  document.getElementById("skip").onclick=()=>{ if(typeof a.v!=="number"){ const cur=S.answers[q.id]||{}; cur.v=null; S.answers[q.id]=cur; save(); } nextQ(); };
  const help=document.getElementById("help"); if(help) help.onclick=()=>{ S.seenHelp=false; save(); renderQ(); };
  const got=document.getElementById("gotit"); if(got) got.onclick=()=>{ S.seenHelp=true; save(); renderQ(); };
  const tr=document.getElementById("toReview"); if(tr) tr.onclick=()=>{ clearTimeout(advanceTimer); S.returnTo=null; go("review"); };
}
function answer(q, v){
  const cur = S.answers[q.id] || {};
  cur.v = v; S.answers[q.id]=cur;
  if(!S.seenHelp) S.seenHelp = true;
  save();
  app.querySelectorAll(".opt").forEach(b=> b.setAttribute("aria-pressed", String(+b.dataset.v===v)));
  clearTimeout(advanceTimer);
  advanceTimer = setTimeout(nextQ, 280);
}
function nextQ(){
  clearTimeout(advanceTimer);
  if(S.returnTo==="review"){ S.returnTo=null; go("review"); return; }
  S.pauses = S.pauses || {};
  if(PAUSES[S.idx] && !S.pauses[S.idx]){ S.pauses[S.idx]=1; S.pauseAt=S.idx; go("pause"); return; }
  if(S.idx < S.order.length-1){ S.idx++; save(); renderQ(); window.scrollTo({top:0}); }
  else go("review");
}
function prevQ(){
  clearTimeout(advanceTimer);
  if(S.idx>0){ S.idx--; save(); renderQ(); window.scrollTo({top:0}); }
  else { S.returnTo=null; go("priorities"); }
}

function renderPause(){
  const at = PAUSES[S.pauseAt] ? S.pauseAt : 11;
  const P = PAUSES[at];
  const N = S.order.length;
  app.innerHTML = `
  ${progressBar((at+1)/N)}
  <section class="sheet pause">
    <p class="eyebrow">Pausa · ${at+1} de ${N} preguntas</p>
    <h2>${P.title}</h2>
    <p class="muted">${P.body}</p>
    <div class="fact"><p class="eyebrow">¿Sabías que…?</p><p>${P.fact}</p></div>
    <p class="small muted">${P.tip}</p>
    <div class="row"><button class="btn" id="go">Seguir con las preguntas</button></div>
  </section>
  <div class="qnav"><button class="btn link" id="back">← Volver a la pregunta ${at+1}</button></div>`;
  document.getElementById("go").onclick=()=>{ S.idx=at+1; go("q"); };
  document.getElementById("back").onclick=()=>{ S.idx=at; delete S.pauses[at]; go("q"); };
}

function renderReview(){
  const N = S.order.length;
  const nAns = answeredCount();
  const nStar = QUESTIONS.filter(q=>S.answers[q.id] && S.answers[q.id].star && typeof S.answers[q.id].v==="number").length;
  const rows = S.order.map((id,k)=>{
    const q=QMAP[id], a=S.answers[id]||{}, has=typeof a.v==="number";
    return `<div class="rv"><button class="rvq" data-k="${k}" aria-label="Cambiar la respuesta a: ${q.short}"><span class="mono">${String(k+1).padStart(2,"0")}</span><span class="rvt">${q.short}</span><span class="rva ${has?"":"na"}">${has?youStance(q,a.v):"Sin responder"}</span></button>
      <button class="star mini" data-s="${id}" aria-pressed="${!!a.star}" aria-label="Decisiva: ${q.short}"><span class="box">${X_SVG}</span>Decisiva</button></div>`;
  }).join("");
  app.innerHTML = `
  <div class="stagehead">
    <p class="eyebrow">Repaso</p>
    <h2>Echa un vistazo antes de seguir</h2>
    <p>Toca cualquier pregunta para cambiar tu respuesta; después volverás aquí. También puedes marcar o desmarcar las decisivas sin salir de esta lista.</p>
  </div>
  <div class="tally"><div><b>${nAns}</b><span>respondidas</span></div><div><b>${N-nAns}</b><span>saltadas</span></div><div><b>${nStar}</b><span>decisivas</span></div></div>
  ${nStar>9 ? `<p class="notice" style="margin-bottom:14px">Has marcado ${nStar} preguntas como decisivas. Si casi todo es decisivo, el doble deja de distinguir: quédate con las que de verdad cambiarían tu voto.</p>` : ""}
  ${nAns<8 ? `<p class="notice" style="margin-bottom:14px">Necesitas responder al menos 8 preguntas para obtener un resultado.</p>` : ""}
  <div class="review">${rows}</div>
  <div class="qnav"><button class="btn link" id="back">← Última pregunta</button><button class="btn" id="next" ${nAns<8?"disabled":""}>${S.completed ? "Ver mi resultado" : "Seguir: propuestas a ciegas →"}</button></div>`;
  app.querySelectorAll(".rvq").forEach(b=> b.onclick=()=>{ S.idx=+b.dataset.k; S.returnTo="review"; go("q"); });
  app.querySelectorAll("[data-s]").forEach(b=> b.onclick=()=>{ const id=b.dataset.s; const cur=S.answers[id]||{v:null}; cur.star=!cur.star; S.answers[id]=cur; save(); renderReview(); });
  document.getElementById("back").onclick=()=>{ S.idx=N-1; go("q"); };
  document.getElementById("next").onclick=()=>{ if(nAns<8) return; go(S.completed ? "results" : "blindintro"); };
}

function renderBlindIntro(){
  app.innerHTML = `
  <section class="sheet pause">
    <p class="eyebrow">Último bloque · ${BLIND.length} propuestas a ciegas</p>
    <h2>¿Y si no supieras quién lo propone?</h2>
    <p class="muted">Ahora verás ${BLIND.length} medidas reales, sacadas de programas electorales o de decisiones de gobierno. Algunas son de partidos que te gustan y otras de partidos que no. No te diremos cuál es cuál hasta el final.</p>
    <p class="muted">No cuentan para la puntuación. Sirven para comprobar si juzgas igual una idea cuando no ves la firma. Responde rápido, con lo primero que pienses.</p>
    <div class="row"><button class="btn" id="go">Empezar</button><button class="btn link" id="skipAll">Saltar este bloque</button></div>
  </section>
  <div class="qnav"><button class="btn link" id="back">← Volver al repaso</button></div>`;
  document.getElementById("go").onclick=()=>{ S.bidx=0; go("blind"); };
  document.getElementById("skipAll").onclick=()=>go("predict");
  document.getElementById("back").onclick=()=>go("review");
}

function renderBlind(){
  const N = BLIND.length;
  const b = BLIND[S.bidx];
  const v = S.blind[b.id];
  app.innerHTML = `
  <div class="progress" aria-hidden="true"><div style="width:${(S.bidx/N*100).toFixed(1)}%"></div></div>
  <div class="qmeta"><span class="eyebrow">Paso 4 de 4 · Propuesta a ciegas ${S.bidx+1} de ${N}</span><span class="eyebrow">No puntúa</span></div>
  <article class="sheet">
    <p class="qtext">${b.text}</p>
    <div class="opts three" role="group" aria-label="Tu valoración">
      ${[[1,"La apoyaría"],[0,"Me da igual"],[-1,"No la apoyaría"]].map(([val,l])=>`<button class="opt" data-v="${val}" aria-pressed="${v===val}"><span class="box">${X_SVG}</span><span>${l}</span></button>`).join("")}
    </div>
  </article>
  <div class="qnav"><button class="btn link" id="prev">← Anterior</button><button class="btn ghost" id="skip">${typeof v==="number"?"Siguiente →":"Saltar →"}</button></div>`;
  app.querySelectorAll(".opt").forEach(el=> el.onclick=()=>{
    S.blind[b.id]=+el.dataset.v; save();
    app.querySelectorAll(".opt").forEach(x=>x.setAttribute("aria-pressed", String(x===el)));
    clearTimeout(advanceTimer); advanceTimer=setTimeout(nextB, 260);
  });
  document.getElementById("prev").onclick=()=>{ clearTimeout(advanceTimer); if(S.bidx>0){ S.bidx--; save(); renderBlind(); } else go("blindintro"); };
  document.getElementById("skip").onclick=nextB;
}
function nextB(){
  clearTimeout(advanceTimer);
  if(S.bidx < BLIND.length-1){ S.bidx++; save(); renderBlind(); window.scrollTo({top:0}); }
  else go("predict");
}

function renderPredict(){
  const elig = PARTIES.filter(eligible);
  app.innerHTML = `
  <div class="stagehead">
    <p class="eyebrow">Antes del resultado</p>
    <h2>¿A qué partido crees que te vas a parecer más?</h2>
    <p>No cambia el cálculo. Sirve para comparar tu intuición con lo que dicen tus respuestas.</p>
  </div>
  <div class="regions">
    ${elig.map(p=>`<button class="choice" data-p="${p.id}" aria-pressed="${S.prediction===p.id}"><span class="box">${X_SVG}</span>${p.name}</button>`).join("")}
    <button class="choice" data-p="NS" aria-pressed="${S.prediction==="NS"}"><span class="box">${X_SVG}</span>No tengo ni idea</button>
  </div>
  <div class="qnav"><button class="btn link" id="back">← Volver</button><button class="btn" id="next">Ver mi resultado</button></div>`;
  app.querySelectorAll("[data-p]").forEach(b=> b.onclick=()=>{ S.prediction=b.dataset.p; save(); renderPredict(); });
  document.getElementById("back").onclick=()=>{ S.bidx=BLIND.length-1; go("blind"); };
  document.getElementById("next").onclick=()=>{ S.completed=true; go("results"); };
}

/* ---------- Resultados ---------- */
function renderResults(){
  const R = compute();
  const n = R.ans.length;
  if(n < 8){
    app.innerHTML = `<div class="stagehead"><h2>Faltan respuestas</h2><p>Has respondido ${n} preguntas. Con menos de 8 el resultado no dice nada útil. Vuelve y contesta algunas más.</p></div>
    <div class="row"><button class="btn" id="backq">Volver a las preguntas</button></div>`;
    document.getElementById("backq").onclick=()=>{ S.idx=0; go("q"); };
    return;
  }
  const top = R.ranked[0], second = R.ranked[1];
  const margin = pct(top.score) - pct(second ? second.score : 0);
  let marginText;
  if(margin<=2) marginText = `Pero la ventaja sobre ${second.p.name} (${pct(second.score)} %) es mínima: es un empate técnico, y lo que os diferencia está más abajo.`;
  else if(margin<=7) marginText = `Le sigue ${second.p.name} con ${pct(second.score)} %. La ventaja es clara, pero no aplastante.`;
  else marginText = `La distancia con el segundo, ${second.p.name} (${pct(second.score)} %), es amplia.`;

  // temas fuertes y débiles del primero
  const thList = THEMES.map(t=>({t, v: top.theme[t.id]})).filter(x=>x.v!==null).sort((a,b)=>b.v-a.v);
  const best2 = thList.slice(0,2).map(x=>lcName(x.t));
  const worst = thList[thList.length-1];

  // prioridades del usuario
  const usedPts = THEMES.reduce((s,t)=>s+(S.points[t.id]||0),0);
  const prioThemes = usedPts ? THEMES.filter(t=>(S.points[t.id]||0)>0).sort((a,b)=>(S.points[b.id]||0)-(S.points[a.id]||0)).slice(0,3) : [];

  let summary = `Tus respuestas coinciden en un <b>${pct(top.score)} %</b> con las posiciones de ${top.p.name}. ${marginText} Tu afinidad con este partido es más alta en ${listJoin(best2)}`;
  if(worst && thList.length>2) summary += `, y más baja en ${lcName(worst.t)} (${pct(worst.v)} %).`; else summary += ".";
  const prioMiss = prioThemes.filter(t=>{
    const bestHere = R.ranked.filter(r=>r.theme[t.id]!==null).sort((a,b)=>b.theme[t.id]-a.theme[t.id])[0];
    return bestHere && bestHere.p.id!==top.p.id;
  });
  if(prioThemes.length){
    if(!prioMiss.length) summary += ` Además, es el partido más cercano a ti en ${prioThemes.length>1?"los temas a los que diste más puntos":"el tema al que diste más puntos"}.`;
    else summary += ` Ojo: en ${listJoin(prioMiss.map(lcName))}, ${prioMiss.length>1?"temas prioritarios":"un tema prioritario"} para ti, hay otro partido más cerca. Lo verás abajo.`;
  }

  // razones
  const coinc = R.ans.map(a=>{ const s=a.q.p[top.i]; if(s===null||a.v===0||s===0||Math.sign(s)!==Math.sign(a.v)) return null; const d=Math.abs(a.v-s); if(d>1) return null; return {a,s,score:a.w*(1-d/4)*(Math.abs(a.v)+Math.abs(s))}; }).filter(Boolean).sort((x,y)=>y.score-x.score).slice(0,5);
  const disc = R.ans.map(a=>{ const s=a.q.p[top.i]; if(s===null) return null; const d=Math.abs(a.v-s); if(d<2) return null; return {a,s,score:a.w*d}; }).filter(Boolean).sort((x,y)=>y.score-x.score).slice(0,4);

  // diferencias entre 1.º y 2.º
  let duel = [];
  if(second){
    duel = R.ans.map(a=>{ const s1=a.q.p[top.i], s2=a.q.p[second.i]; if(s1===null||s2===null) return null; const g=Math.abs(s1-s2); if(g<2) return null; const d1=Math.abs(a.v-s1), d2=Math.abs(a.v-s2); return {a,s1,s2,closer: d1<d2?top:(d2<d1?second:null), score:a.w*g*(1+Math.abs(d1-d2))}; }).filter(Boolean).sort((x,y)=>y.score-x.score).slice(0,5);
  }

  const reasonItem = (it, party, neg)=>{
    const q=it.a.q; const note = q.n && q.n[party.p.id];
    return `<div class="li ${neg?"neg":""}"><span class="sym" aria-hidden="true">${neg?"≠":"="}</span><div>
      <h3>${q.short}</h3>
      <div class="pair"><span>Tú: <b>${youStance(q,it.a.v)}</b></span><span>${party.p.sig}: <b>${stance(q,it.s)}</b></span>${it.a.star?`<span class="mono">DECISIVA</span>`:""}</div>
      ${note?`<p class="note">${note}</p>`:""}</div></div>`;
  };

  // tarjetas de prioridades
  const prioSource = prioThemes.length ? prioThemes : THEMES.map(t=>({t, n: R.ans.filter(a=>a.q.t===t.id).length})).sort((a,b)=>b.n-a.n).slice(0,3).map(x=>x.t);
  const prioCards = prioSource.map(t=>{
    const list = R.ranked.filter(r=>r.theme[t.id]!==null).sort((a,b)=>b.theme[t.id]-a.theme[t.id]);
    if(!list.length) return "";
    const b = list[0]; const topHere = top.theme[t.id];
    const same = b.p.id===top.p.id;
    return `<div class="pc"><p class="eyebrow">${prioThemes.length ? (S.points[t.id]+" de "+BUDGET+" puntos") : "Tema"}</p><h3>${t.name}</h3>
      <p>Más cerca: <b>${b.p.name}</b> (${pct(b.theme[t.id])} %).${same? " Coincide con tu primera opción." : ` ${top.p.sig} se queda en ${topHere===null?"—":pct(topHere)+" %"}.`}</p>
      ${list[1]?`<p class="small">Después: ${list[1].p.name} (${pct(list[1].theme[t.id])} %).</p>`:""}</div>`;
  }).join("");

  // mapa de calor
  const prioIds = new Set(prioThemes.map(t=>t.id));
  const heat = `<div class="scroll"><table class="heat"><thead><tr><th class="pt">Partido</th>${THEMES.map(t=>`<th class="${prioIds.has(t.id)?"prio":""}" title="${t.name}">${t.short}</th>`).join("")}<th>Total</th></tr></thead><tbody>
    ${R.ranked.map(r=>`<tr><td class="pt">${r.p.sig}</td>${THEMES.map(t=>{ const v=r.theme[t.id]; return v===null?`<td class="na">—</td>`:`<td style="background:color-mix(in srgb, var(--heat) ${Math.round(Math.max(0,(v-0.35)/0.65)*42)}%, transparent)">${pct(v)}</td>`; }).join("")}<td><b>${pct(r.score)}</b></td></tr>`).join("")}
  </tbody></table></div><p class="legend"><span>Cifras: % de coincidencia en cada tema</span><span>— = sin datos o sin respuestas</span>${prioThemes.length?"<span>En negrita: tus temas prioritarios</span>":""}</p>`;

  // ejes
  const axes = [["econ","Economía","Más Estado","Más mercado"],["social","Sociedad y valores","Más progresista","Más conservador"],["terr","Territorio","Más autogobierno","Más centralización"]];
  const axesHtml = axes.map(([ax,label,l,r])=>axisSvg(ax,label,l,r,R)).join("");

  // matices
  const tens = tensions(R.ans);

  // a ciegas
  const blindAns = BLIND.filter(b=>typeof S.blind[b.id]==="number");
  const sup = blindAns.filter(b=>S.blind[b.id]===1);
  const supL = sup.filter(b=>b.side==="izq").length, supR = sup.filter(b=>b.side==="der").length;
  let blindMsg = "";
  if(blindAns.length){
    if(supL && supR) blindMsg = `Apoyaste <b>${supL}</b> ${supL===1?"medida que venía":"medidas que venían"} de la izquierda y <b>${supR}</b> de la derecha. Cuando no sabes quién firma una idea, no votas en bloque.`;
    else if(supL) blindMsg = `Todas las medidas que apoyaste (${supL}) venían de partidos de izquierda. Tus intuiciones son coherentes con un lado, incluso a ciegas.`;
    else if(supR) blindMsg = `Todas las medidas que apoyaste (${supR}) venían de partidos de derecha. Tus intuiciones son coherentes con un lado, incluso a ciegas.`;
    else blindMsg = "No apoyaste ninguna de las propuestas a ciegas.";
  }

  // predicción
  let predHtml = "";
  if(S.prediction && S.prediction!=="NS"){
    const pr = R.ranked.findIndex(r=>r.p.id===S.prediction);
    if(pr===0) predHtml = `<p>Pensabas que te parecerías más a <b>${top.p.name}</b> y tus respuestas lo confirman.</p>`;
    else if(pr>0){
      const rp = R.ranked[pr];
      const gaps = R.ans.map(a=>{ const s=a.q.p[rp.i]; if(s===null) return null; const d=Math.abs(a.v-s); if(d<2) return null; return {a,s,score:a.w*d}; }).filter(Boolean).sort((x,y)=>y.score-x.score).slice(0,3);
      predHtml = `<p>Pensabas que te parecerías más a <b>${rp.p.name}</b>. Queda en el puesto ${pr+1}, con un ${pct(rp.score)} % de coincidencia (${pct(top.score)-pct(rp.score)} puntos por debajo de ${top.p.sig}).${pr<=2?" Tu intuición no iba desencaminada.":""} Estos son los temas en los que más os separáis:</p>
      <div class="list" style="margin-top:12px">${gaps.map(g=>reasonItem(g, rp, true)).join("")}</div>`;
    }
  } else if(S.prediction==="NS") predHtml = `<p>No tenías una intuición previa. El resultado de arriba es tu punto de partida para leer programas.</p>`;

  const elig = R.ranked;
  const fullTable = `<div class="scroll"><table class="heat full"><thead><tr><th class="pt">Pregunta</th><th>Tú</th>${elig.map(r=>`<th>${r.p.sig}</th>`).join("")}</tr></thead><tbody>
    ${QUESTIONS.map(q=>{ const a=S.answers[q.id]; const v = a && typeof a.v==="number" ? a.v : null;
      return `<tr><td class="q pt">${q.short}${a&&a.star?" <span class='mono'>(decisiva)</span>":""}</td><td class="you">${v===null?"—":code(q,v)}</td>${elig.map(r=>{ const s=q.p[r.i]; if(s===null) return `<td class="na">?</td>`; const ag = v===null?null:1-Math.abs(v-s)/4; return `<td ${ag!==null?`style="background:color-mix(in srgb, var(--heat) ${Math.round(Math.max(0,(ag-0.5)/0.5)*38)}%, transparent)"`:""}>${code(q,s)}</td>`; }).join("")}</tr>`; }).join("")}
  </tbody></table></div><p class="legend"><span>++ muy a favor · + a favor · · neutral · − en contra · −− muy en contra</span><span>A+/A/=/B/B+ en los dilemas</span><span>? sin posición clara</span><span>Color: más intenso cuanto más coincides</span></p>`;

  app.innerHTML = `
  <section class="verdict">
    <p class="eyebrow">Tu resultado · ${n} de ${QUESTIONS.length} preguntas respondidas${S.region && S.region!=="ND" ? " · "+regionName(S.region) : ""}</p>
    <h1>El partido más cercano a tus respuestas es ${top.p.name} <span class="pct">${pct(top.score)} %</span></h1>
    <p class="summary">${summary}</p>
    ${top.cover<0.75?`<p class="small muted">Atención: de ${top.p.sig} solo conocemos posición en parte de las preguntas que respondiste (${pct(top.cover)} % del peso); en el resto se le ha asignado una posición neutral. El resultado es menos fiable.</p>`:""}
    <div class="podium">${R.ranked.slice(0,3).map((r,k)=>`<div class="pod ${k===0?"first":""}"><span class="eyebrow">${k+1}.º</span><b>${r.p.name}</b><span class="pp">${pct(r.score)} %</span></div>`).join("")}</div>
    <details class="howto"><summary>Cómo leer este porcentaje</summary>
      <p class="small muted" style="margin-top:8px;max-width:66ch">Mide cuánto se parecen tus respuestas a las posiciones de cada partido, dando más peso a los temas a los que diste puntos y a las preguntas que marcaste como decisivas. Un 100 % sería coincidir en todo y un 0 %, estar siempre en el extremo opuesto. Un 50 % no es «la mitad de acuerdo»: significa que, de media, estáis a medio camino. Diferencias de 2 o 3 puntos son prácticamente un empate.</p>
    </details>
    <div class="row"><button class="btn ghost" id="copy">Copiar resumen</button><button class="btn link" id="edit2">Cambiar alguna respuesta</button></div>
    <textarea id="copybox" class="copybox" readonly hidden aria-label="Resumen para copiar"></textarea>
  </section>
  <div id="donate" style="margin-top:22px"></div>
  <nav class="jump" id="jump" aria-label="En esta página"></nav>

  <section class="section" id="s-rank" data-label="Ranking">
    <h2>Todos los partidos</h2>
    <p class="sub">Porcentaje de coincidencia ponderado por tus prioridades, solo con los partidos que se presentan donde votas.</p>
    <div class="rank">${R.ranked.map((r,k)=>`<div class="r ${k===0?"first":""}"><span class="pos">${k+1}.</span><span class="nm" title="${r.p.name}">${r.p.name}</span><span class="bar"><i style="width:${pct(r.score)}%"></i></span><span class="val">${pct(r.score)} %</span>${r.cover<0.75?`<span class="flag">Posición conocida solo en parte de tus respuestas (${pct(r.cover)} % del peso)</span>`:""}</div>`).join("")}</div>
    ${R.others.length?`<details style="margin-top:14px"><summary class="small muted">Partidos que no se presentan en ${regionName(S.region)} (${R.others.length})</summary><div class="rank" style="margin-top:10px">${R.others.map(r=>`<div class="r"><span class="pos">–</span><span class="nm">${r.p.name}</span><span class="bar"><i style="width:${pct(r.score)}%"></i></span><span class="val">${pct(r.score)} %</span></div>`).join("")}</div></details>`:""}
  </section>

  ${predHtml?`<section class="section" id="s-pred" data-label="Tu intuición"><h2>Tu intuición frente a tus respuestas</h2>${predHtml}</section>`:""}

  <section class="section" id="s-why" data-label="Por qué">
    <h2>Por qué ${top.p.name}</h2>
    <p class="sub">Las coincidencias que más pesan en el resultado (por intensidad y por la importancia que les diste), y las discrepancias que deberías conocer antes de votar.</p>
    <div class="twocol">
      <div><p class="eyebrow" style="margin-bottom:8px">Donde coincidís</p><div class="list">${coinc.length?coinc.map(c=>reasonItem(c,top,false)).join(""):`<p class="small muted" style="padding:12px 0">No hay coincidencias fuertes: tu afinidad viene de muchas posiciones intermedias.</p>`}</div></div>
      <div><p class="eyebrow" style="margin-bottom:8px">Donde no coincidís</p><div class="list">${disc.length?disc.map(c=>reasonItem(c,top,true)).join(""):`<p class="small muted" style="padding:12px 0">No hay ninguna pregunta en la que estéis en lados opuestos.</p>`}</div></div>
    </div>
  </section>

  ${second && duel.length?`<section class="section" id="s-duel" data-label="1.º frente a 2.º">
    <h2>${top.p.sig} frente a ${second.p.sig}</h2>
    <p class="sub">Si dudas entre los dos primeros, esto es lo que de verdad los separa y hacia dónde caes tú en cada punto.</p>
    <div class="list">${duel.map(d=>{ const q=d.a.q; return `<div class="li"><span class="sym" aria-hidden="true">${d.closer?(d.closer===top?"1":"2"):"·"}</span><div><h3>${q.short}</h3>
      <div class="pair"><span>Tú: <b>${youStance(q,d.a.v)}</b></span><span>${top.p.sig}: <b>${stance(q,d.s1)}</b></span><span>${second.p.sig}: <b>${stance(q,d.s2)}</b></span></div>
      <p class="note">${d.closer?`Aquí estás más cerca de <b>${d.closer.p.name}</b>.`:"Aquí estás a la misma distancia de los dos."}</p></div></div>`; }).join("")}</div>
  </section>`:""}

  <section class="section" id="s-themes" data-label="Por temas">
    <h2>${prioThemes.length?"En los temas que más te importan":"Tema a tema"}</h2>
    <p class="sub">${prioThemes.length?"Tus tres temas con más puntos y el partido que más se acerca a ti en cada uno.":"No repartiste puntos, así que aquí van los temas en los que más respondiste."}</p>
    <div class="prioCards">${prioCards}</div>
    <div style="margin-top:22px">${heat}</div>
  </section>

  <section class="section" id="s-axes" data-label="Tus ejes">
    <h2>Dónde te sitúas</h2>
    <p class="sub">Tu posición media en tres ejes, junto a la de los partidos que puedes votar. La X eres tú. Mucha gente descubre que no está en el mismo sitio en los tres.</p>
    <div class="axes">${axesHtml}</div>
  </section>

  ${tens.length?`<section class="section" id="s-tens" data-label="Matices">
    <h2>Matices en tus respuestas</h2>
    <p class="sub">Preguntas sobre la misma cuestión en las que respondiste hacia lados distintos. No es un error: significa que no compras un paquete ideológico completo. Son los temas en los que más te conviene leer la letra pequeña de cada programa.</p>
    <div class="list">${tens.map(t=>`<div class="li"><span class="sym" aria-hidden="true">~</span><div><h3>${t.label}</h3><div class="pair"><span>${t.a.q.short}: <b>${youStance(t.a.q,t.a.v)}</b></span><span>${t.b.q.short}: <b>${youStance(t.b.q,t.b.v)}</b></span></div></div></div>`).join("")}</div>
  </section>`:""}

  ${blindAns.length?`<section class="section" id="s-blind" data-label="A ciegas">
    <h2>Las propuestas a ciegas, destapadas</h2>
    <p class="sub">${blindMsg}</p>
    <div class="blindgrid">${BLIND.map(b=>{ const v=S.blind[b.id]; return `<div class="bl"><div><p>${b.text}</p><p class="you">Tú: ${v===1?"la apoyarías":v===0?"te da igual":v===-1?"no la apoyarías":"sin respuesta"}</p></div><p class="orig"><b>${b.who}</b>${b.detail}</p></div>`; }).join("")}</div>
  </section>`:""}

  <section class="section" id="s-all" data-label="Todas tus respuestas">
    <h2>Todas tus respuestas, pregunta a pregunta</h2>
    <p class="sub">Tu respuesta junto a la posición de cada partido que puedes votar.</p>
    <details><summary class="small" style="cursor:pointer;font-weight:600">Mostrar la tabla completa</summary><div style="margin-top:12px">${fullTable}</div></details>
  </section>

  <section class="section" style="border-bottom:0">
    <div class="callout"><b>Esto no es un mandato.</b> Es una comparación entre tus respuestas y nuestra lectura de lo que defiende cada partido. Antes de votar, lee al menos los capítulos de los programas de tus dos o tres primeros partidos sobre tus temas prioritarios. Los programas para el 29N se publicarán en las próximas semanas.</div>
    <div class="row" style="margin-top:18px">
      <button class="btn" id="redo">Repetir el test</button>
      <button class="btn ghost" id="edit">Cambiar respuestas</button>
      <button class="btn ghost" id="seeParties">Ver fichas de los partidos</button>
      <button class="btn link" id="wipe">Borrar mis respuestas de este navegador</button>
    </div>
  </section>`;
  document.getElementById("redo").onclick=()=>{ S=fresh(); save(); go("region"); };
  document.getElementById("edit").onclick=()=>go("review");
  document.getElementById("edit2").onclick=()=>go("review");
  renderDonate();
  const jump=document.getElementById("jump");
  jump.innerHTML = `<span class="eyebrow">En esta página</span>` + [...app.querySelectorAll(".section[id]")].map(sec=>`<button class="chip" data-j="${sec.id}">${sec.dataset.label}</button>`).join("");
  jump.querySelectorAll("[data-j]").forEach(b=> b.onclick=()=>{ const el=document.getElementById(b.dataset.j); const d=el.querySelector("details"); if(b.dataset.j==="s-all" && d) d.open=true; el.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); });
  const copyText = `Mi resultado en Sin Etiquetas 29N (${n} preguntas):\n` + R.ranked.slice(0,5).map((r,k)=>`${k+1}. ${r.p.name}: ${pct(r.score)} %`).join("\n");
  document.getElementById("copy").onclick=(e)=>{
    const btn=e.currentTarget, box=document.getElementById("copybox");
    const fallback=()=>{ box.hidden=false; box.value=copyText; box.focus(); box.select(); btn.textContent="Selecciona y copia el texto"; };
    try{ navigator.clipboard.writeText(copyText).then(()=>{ btn.textContent="Copiado"; setTimeout(()=>btn.textContent="Copiar resumen",1800); }, fallback); }catch(err){ fallback(); }
  };
  document.getElementById("seeParties").onclick=()=>setView("partidos");
  document.getElementById("wipe").onclick=()=>{ try{ localStorage.removeItem(KEY); }catch(e){} S=fresh(); go("intro"); };
}

function tensions(ans){
  const out=[]; const used=new Set();
  const labels={econ:"Papel del Estado en la economía", social:"Sociedad, seguridad y valores", terr:"Modelo territorial"};
  const strong = ans.filter(a=>a.q.ax && Math.abs(a.v)===2);
  for(const ax of ["econ","social","terr"]){
    const pos = strong.filter(a=>a.q.ax===ax && a.v*a.q.sg>0);
    const neg = strong.filter(a=>a.q.ax===ax && a.v*a.q.sg<0);
    // prioriza pares del mismo tema
    let pair=null;
    for(const p of pos){ for(const n of neg){ if(p.q.t===n.q.t && !used.has(p.q.id) && !used.has(n.q.id)){ pair=[p,n]; break; } } if(pair) break; }
    if(!pair && pos.length && neg.length) pair=[pos[0],neg[0]];
    if(pair){ used.add(pair[0].q.id); used.add(pair[1].q.id); out.push({label: pair[0].q.t===pair[1].q.t ? TMAP[pair[0].q.t].name : labels[ax], a:pair[0], b:pair[1]}); }
  }
  return out;
}

function axisSvg(ax,label,l,r,R){
  const W=520, pad=30, inner=W-pad*2;
  const xOf = v => pad + (v+1)/2*inner;
  const u = axisUser(R.ans, ax);
  const pts = R.ranked.map(rk=>({sig:rk.p.sig, v:axisParty(rk.i,ax), top: rk===R.ranked[0]})).filter(p=>p.v!==null).sort((a,b)=>a.v-b.v);
  // reparto en carriles para que las etiquetas no se pisen
  const lanes=[]; const LW = s => s.length*8.2+10;
  pts.forEach(p=>{ const x=xOf(p.v), w=LW(p.sig); let k=0; while(lanes[k]!==undefined && lanes[k] > x-w/2) k++; lanes[k]=x+w/2; p.lane=k; p.x=x; });
  const nL = Math.max(1, lanes.length);
  const lineY = 36, H = lineY + 20 + nL*19 + 6;
  const ticks = [-1,-0.5,0,0.5,1].map(t=>`<line x1="${xOf(t)}" x2="${xOf(t)}" y1="${lineY-5}" y2="${lineY+5}" stroke="var(--ink-3)" stroke-width="1"/>`).join("");
  const marks = pts.map(p=>{ const y = lineY+22+p.lane*19; return `<line x1="${p.x}" x2="${p.x}" y1="${lineY}" y2="${y-11}" stroke="var(--rule)" stroke-width="1"/><circle cx="${p.x}" cy="${lineY}" r="4" fill="${p.top?"var(--accent)":"var(--ink-2)"}"/><text x="${p.x}" y="${y}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12.5" fill="${p.top?"var(--accent-ink)":"var(--ink-2)"}" font-weight="${p.top?600:400}">${p.sig}</text>`; }).join("");
  const you = u===null ? "" : `<g><path d="M${xOf(u)-7} ${lineY-7} L${xOf(u)+7} ${lineY+7} M${xOf(u)+7} ${lineY-7} L${xOf(u)-7} ${lineY+7}" stroke="var(--accent)" stroke-width="3"/><text x="${xOf(u)}" y="${lineY-14}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12.5" font-weight="600" fill="var(--accent-ink)">TÚ</text></g>`;
  return `<div class="axis"><h3>${label}</h3><div class="ends"><span>← ${l}</span><span>${r} →</span></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}: tu posición y la de los partidos"><line x1="${pad}" x2="${W-pad}" y1="${lineY}" y2="${lineY}" stroke="var(--ink-3)" stroke-width="1.5"/>${ticks}${marks}${you}</svg></div>`;
}

/* ---------- Envío anónimo (solo si el servidor lo tiene activado) ---------- */
let CONF = null, tsToken = null, tsWaiting = [];
fetch("/api/config").then(r=>r.ok?r.json():null).then(c=>{ CONF=c; if(view==="test" && S.stage==="results") renderDonate(); }).catch(()=>{});

function loadTurnstile(cb){
  if(window.turnstile) return cb();
  tsWaiting.push(cb);
  if(document.getElementById("tsjs")) return;
  window.onTsLoad = ()=>{ tsWaiting.forEach(f=>f()); tsWaiting=[]; };
  const sc=document.createElement("script"); sc.id="tsjs"; sc.async=true;
  sc.src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTsLoad&render=explicit";
  document.head.appendChild(sc);
}

function renderDonate(){
  const box=document.getElementById("donate"); if(!box) return;
  if(!CONF || !CONF.submissions){ box.innerHTML=""; return; }
  if(S.receipt){
    box.innerHTML=`<div class="donate"><p class="eyebrow">Gracias</p><h2>Tus respuestas ya forman parte del resultado colectivo</h2>
      <p class="small muted">Este es tu recibo. Con él puedes comprobar cuando quieras que tu respuesta está en el registro público y que nadie la ha cambiado. No te identifica: guárdalo si quieres hacer esa comprobación.</p>
      <p class="receipt" id="rcpt">${S.receipt}</p>
      <div class="row"><button class="btn ghost" id="copyR">Copiar recibo</button><a class="btn link" href="/resultados/#d-int">Ver los resultados en directo y comprobarlo</a></div></div>`;
    document.getElementById("copyR").onclick=(e)=>{ const b=e.currentTarget; try{ navigator.clipboard.writeText(S.receipt).then(()=>{ b.textContent="Copiado"; }, ()=>selectText("rcpt")); }catch(err){ selectText("rcpt"); } };
    return;
  }
  const sel=(id,label,list)=>`<label for="${id}">${label}<select id="${id}"><option value="">Prefiero no decirlo</option>${list.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></label>`;
  box.innerHTML=`<form class="donate" id="donateForm" novalidate>
    <p class="eyebrow">Opcional · anónimo</p>
    <h2>¿Sumas tus respuestas al resultado colectivo?</h2>
    <p class="small muted">Se envían tus respuestas, tu reparto de puntos, tu comunidad y tu resultado. Nada que te identifique: ni nombre, ni correo, ni dirección IP. Los datos se publican abiertos para que cualquiera pueda comprobar que no hay trampas. <a href="/resultados/">Ver los resultados en directo</a>.</p>
    <p class="small">Estas tres preguntas ayudan a corregir que participen más personas de unos grupos que de otros. Puedes dejarlas en blanco.</p>
    <div class="fields">${sel("dAge","Edad",SE.DEMO.age)}${sel("dSex","Sexo",SE.DEMO.sex)}${sel("dVote","¿Qué votaste en 2023?",SE.DEMO.vote23)}</div>
    <label class="consent"><input type="checkbox" id="dOk"><span>Acepto enviar mis respuestas de forma anónima para las estadísticas públicas. Entiendo que incluyen opiniones políticas y que, como no se pueden vincular a mí, después no se pueden localizar para borrarlas. <a href="/privacidad/" target="_blank" rel="noopener">Política de privacidad</a></span></label>
    <div id="ts"></div>
    <div class="row"><button class="btn" type="submit" id="dSend">Enviar de forma anónima</button><span id="dMsg" class="small" aria-live="polite"></span></div>
  </form>`;
  if(CONF.turnstileSiteKey) loadTurnstile(()=>{ try{ window.turnstile.render("#ts",{sitekey:CONF.turnstileSiteKey, language:"es", callback:t=>{ tsToken=t; }, "expired-callback":()=>{ tsToken=null; }}); }catch(e){} });
  document.getElementById("donateForm").onsubmit=async (e)=>{
    e.preventDefault();
    const msg=document.getElementById("dMsg"), btn=document.getElementById("dSend");
    msg.className="small";
    if(!document.getElementById("dOk").checked){ msg.className="small status-err"; msg.textContent="Marca la casilla de consentimiento para enviar."; return; }
    if(CONF.demo){ msg.className="small"; msg.textContent="Esto es una demostración: no se ha enviado nada. En la web real aquí recibirías tu recibo."; return; }
    if(CONF.turnstileSiteKey && !tsToken){ msg.className="small status-err"; msg.textContent="Espera un momento a que termine la comprobación antibots."; return; }
    btn.disabled=true; msg.textContent="Enviando…";
    const payload={ consent:true, clientId:S.clientId, region:S.region||"ND", answers:S.answers, points:S.points, blind:S.blind,
      prediction:S.prediction||null, durationS:S.durS, token:tsToken,
      age:document.getElementById("dAge").value||null, sex:document.getElementById("dSex").value||null, vote23:document.getElementById("dVote").value||null };
    try{
      const r=await fetch("/api/submit",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
      const j=await r.json().catch(()=>({}));
      if(r.status===201){ S.receipt=j.receipt; save(); renderDonate(); return; }
      if(r.status===409){ msg.className="small status-err"; msg.textContent="Ya se enviaron respuestas desde este navegador."; return; }
      msg.className="small status-err"; msg.textContent=j.error||"No se ha podido enviar. Inténtalo más tarde.";
      if(window.turnstile && CONF.turnstileSiteKey){ try{ window.turnstile.reset("#ts"); tsToken=null; }catch(err){} }
    }catch(err){ msg.className="small status-err"; msg.textContent="Sin conexión con el servidor. Inténtalo más tarde."; }
    finally{ btn.disabled=false; }
  };
}
function selectText(id){ const el=document.getElementById(id); const r=document.createRange(); r.selectNodeContents(el); const s=getSelection(); s.removeAllRanges(); s.addRange(r); }

/* ---------- Partidos ---------- */
function renderParties(){
  const list = PARTIES.filter(p=> partyFilter==="all" || (partyFilter==="nat" ? !p.where : !!p.where));
  app.innerHTML = `
  <div class="stagehead"><p class="eyebrow">Los partidos</p><h2>Quién se presenta y qué defiende</h2>
  <p>Fichas de los partidos incluidos en el test, en orden de resultado en 2023. Para cada uno: de dónde viene, quién lo dirige y su posición en las 36 preguntas, con la explicación cuando la hay. Sugerencia: si aún no has hecho el test, hazlo antes de leer esto.</p></div>
  <div class="filterbar">${[["all","Todos"],["nat","Ámbito estatal"],["reg","Ámbito autonómico"]].map(([k,l])=>`<button class="chip" data-f="${k}" aria-pressed="${partyFilter===k}">${l}</button>`).join("")}</div>
  <div class="plist">${list.map(p=>{ const i=PIDX[p.id]; const known = QUESTIONS.filter(q=>q.p[i]!==null).length;
    return `<article class="pcard" id="p-${p.id}"><header><div class="sig">${p.sig}</div><div><h2>${p.name}</h2><p class="ideo">${p.ideo}</p></div></header>
    <p>${p.about}</p>
    <dl class="kv"><div><dt>Liderazgo</dt><dd>${p.lead}</dd></div><div><dt>Resultado 2023</dt><dd>${p.res}</dd></div><div><dt>Se presenta en</dt><dd>${p.where? p.where.map(regionName).join(" y ") : "Toda España"}</dd></div><div><dt>Web</dt><dd>${p.web?`<a href="${p.web}" target="_blank" rel="noopener">${p.web.replace(/^https?:\/\/(www\.)?/,"")}</a>`:"—"}</dd></div></dl>
    <div><p class="eyebrow" style="margin-bottom:6px">Señas de identidad</p><ul>${p.keys.map(k=>`<li>${k}</li>`).join("")}</ul></div>
    <details><summary>Su posición en las 36 preguntas (conocida en ${known})</summary><div class="ppos">
      ${THEMES.map(t=>`<div><h4>${t.name}</h4>${QUESTIONS.filter(q=>q.t===t.id).map(q=>`<div class="pr"><span>${q.short}</span><span class="st">${stance(q,q.p[i])}</span>${q.n&&q.n[p.id]?`<span class="nt">${q.n[p.id]}</span>`:""}</div>`).join("")}</div>`).join("")}
    </div></details></article>`; }).join("")}</div>
  <section class="section" style="border-bottom:0">
    <h2>Otros partidos que no están en el test</h2>
    <p class="sub">No se incluyen porque no tuvieron escaño en 2023 ni representación europea, o porque concurren dentro de otras candidaturas. Eso no significa que no puedas votarlos.</p>
    <ul class="prose" style="padding-left:1.2em">
      <li><b>Unión del Pueblo Navarro (UPN).</b> Centroderecha regionalista navarra. 1 escaño en 2023.</li>
      <li><b>Geroa Bai.</b> Coalición navarra en la que participa el PNV.</li>
      <li><b>Compromís.</b> Valencianismo de izquierdas; parte del partido concurrió dentro de Sumar en 2023.</li>
      <li><b>Ciudadanos.</b> Centro liberal. Sin escaños desde 2023.</li>
      <li><b>PACMA.</b> Partido animalista.</li>
      <li><b>Aliança Catalana.</b> Independentismo catalán de derecha, con escaños en el Parlament desde 2024. A mediados de octubre de 2026 no estaba confirmado que se presente al Congreso.</li>
      <li><b>Plataformas de la España Vaciada, como Teruel Existe.</b> Partidos centrados en la despoblación.</li>
    </ul>
  </section>`;
  app.querySelectorAll("[data-f]").forEach(b=> b.onclick=()=>{ partyFilter=b.dataset.f; renderParties(); });
}

/* ---------- Método ---------- */
function renderMethod(){
  app.innerHTML = `
  <div class="prose">
    <p class="eyebrow">Cómo funciona</p>
    <h1 style="font-size:clamp(1.8rem,5vw,2.6rem);font-weight:850;font-stretch:108%">Método, fuentes y límites</h1>
    <p>Sin Etiquetas compara tus respuestas con la posición de cada partido en 36 cuestiones concretas. No te dice qué es correcto: te dice quién piensa como tú en lo que tú consideras importante.</p>

    <h2>Cómo se evita que respondas por ideología</h2>
    <ol>
      <li><b>Sin nombres ni etiquetas.</b> Ninguna pregunta menciona partidos ni usa etiquetas ideológicas. Los partidos se nombran en las notas que aparecen en los resultados, nunca durante el test.</li>
      <li><b>Lenguaje descriptivo.</b> Se evitan términos de combate («okupas», «ley mordaza», «golpistas», «fachas»). Se usa el nombre oficial de cada norma o una descripción neutra.</li>
      <li><b>Cada medida con su coste.</b> Muchas afirmaciones incluyen su consecuencia negativa más citada. Así importa cuánto valoras la medida y no solo si te suena bien.</li>
      <li><b>Dirección alternada.</b> Estar de acuerdo con una frase unas veces te acerca a la izquierda y otras a la derecha. Si respondes por reflejo, el test lo nota.</li>
      <li><b>Dilemas.</b> En ocho preguntas eliges entre dos opciones razonables, como un gobierno con recursos limitados.</li>
      <li><b>Orden aleatorio.</b> Las preguntas se mezclan para cada persona y nunca van dos del mismo tema seguidas, para que no te «pongas en modo» de un tema.</li>
      <li><b>Argumentos de los dos lados.</b> En cada pregunta puedes desplegar el mejor argumento a favor y en contra antes de responder.</li>
      <li><b>Propuestas a ciegas.</b> Nueve medidas reales de partidos distintos, sin firma. No puntúan; al final se destapan.</li>
      <li><b>Intuición registrada.</b> Antes del resultado te preguntamos a quién crees que te vas a parecer, para que puedas comparar.</li>
    </ol>

    <h2>Cómo se calcula</h2>
    <p>Cada respuesta va de −2 (muy en desacuerdo, o claramente A) a +2 (muy de acuerdo, o claramente B). Cada partido tiene una posición en la misma escala. La coincidencia en una pregunta es <code>1 − |tu respuesta − posición del partido| / 4</code>: 100 % si coincidís, 0 % si estáis en extremos opuestos.</p>
    <p>El peso de cada pregunta depende de los puntos que diste a su tema (cada tema pesa lo mismo tenga más o menos preguntas) y se duplica si la marcaste como decisiva. Los temas con 0 puntos conservan un peso pequeño. Si no repartiste puntos, todos los temas pesan igual.</p>
    <p>Las preguntas que saltas no cuentan. Si de un partido no hay posición clara en una pregunta, se le asigna una posición neutral (0), como hacen otros tests de afinidad, y el resultado avisa cuando falta información en más de una cuarta parte del peso.</p>
    <p>Los ejes del mapa son medias simples de las preguntas de cada eje. El de economía va de más Estado a más mercado, el social de más progresista a más conservador, y el territorial de más autogobierno a más centralización.</p>

    <h2>De dónde salen las posiciones</h2>
    <ul>
      <li>Programas electorales de las generales de julio de 2023 (y de las europeas de 2024 en el caso de Se Acabó La Fiesta).</li>
      <li>Votaciones en el Congreso durante la legislatura 2023-2026: amnistía, jornada de 37,5 horas, delegación de competencias, reforma del CGPJ, entre otras.</li>
      <li>Medidas de gobierno y declaraciones públicas de los dirigentes hasta el 15 de octubre de 2026.</li>
    </ul>
    <p>Las elecciones del 29 de noviembre se convocaron por sorpresa el 5 de octubre de 2026 y los partidos aún no han publicado sus programas. Algunas posiciones pueden cambiar cuando lo hagan.</p>

    <h2>Límites</h2>
    <ul>
      <li>Codificar posiciones exige interpretar. Esta versión se ha preparado con ayuda de inteligencia artificial y cada posición debería contrastarse con las fuentes originales. Si ves un error, compáralo con el programa del partido.</li>
      <li>Treinta y seis preguntas no recogen todo. Faltan temas como la corrupción, la cultura o la política agraria en detalle, porque casi todos los partidos dicen lo mismo o no hay posiciones claras.</li>
      <li>Un partido puede defender algo y no cumplirlo. El test mide lo que dicen y votan, no lo que harán.</li>
      <li>El sistema electoral importa: en provincias que eligen pocos diputados, a los partidos pequeños les cuesta más obtener escaño. El test no tiene eso en cuenta.</li>
    </ul>

    <h2>Información práctica</h2>
    <ul>
      <li>Fecha: domingo 29 de noviembre de 2026. Campaña electoral del 13 al 27 de noviembre.</li>
      <li><a href="https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/interior/Paginas/guia-dudas-elecciones-generales-29n.aspx" target="_blank" rel="noopener">Guía oficial del 29N (La Moncloa)</a>: voto por correo, plazos y dudas frecuentes.</li>
      <li><a href="https://www.juntaelectoralcentral.es/cs/jec/eleccionesEnCurso/Elecciones_generales_2026" target="_blank" rel="noopener">Junta Electoral Central</a>: candidaturas oficiales y calendario.</li>
    </ul>

    <h2>Privacidad</h2>
    <p>Tus respuestas se guardan en tu navegador para que puedas continuar el test si lo cierras. Solo se envían si, al final, decides sumarlas al resultado colectivo, y entonces van sin nada que te identifique. Los detalles están en la <a href="/privacidad/">política de privacidad</a>, y los resultados en directo, en <a href="/resultados/">esta página</a>.</p>
  </div>`;
}

/* ============================================================
   ARRANQUE
   ============================================================ */
document.querySelectorAll("nav.tabs button").forEach(b=> b.onclick=()=>setView(b.dataset.view));

document.addEventListener("keydown", e=>{
  if(view!=="test" || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target; if(t && (t.tagName==="INPUT"||t.tagName==="TEXTAREA")) return;
  if(S.stage==="q"){
    const q = QMAP[S.order[S.idx]];
    if(/^[1-5]$/.test(e.key)){ answer(q, +e.key-3); }
    else if(e.key==="ArrowLeft"){ prevQ(); }
    else if(e.key==="ArrowRight"){ const a=S.answers[q.id]; if(!(a && typeof a.v==="number")){ const cur=a||{}; cur.v=null; S.answers[q.id]=cur; save(); } nextQ(); }
  }
});
const h = (location.hash||"").replace("#","");
setView(h==="partidos" ? "partidos" : h==="metodo" ? "metodo" : "test");
