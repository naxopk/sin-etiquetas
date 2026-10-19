/* Sin Etiquetas · juego «¿De quién es?» (necesita shared.js y compartir.js).
   Las 9 propuestas a ciegas del test: hay que adivinar de qué lado viene cada una. Todo pasa en el navegador;
   no se envía nada y no cuenta para la muestra. Se pregunta por el lado y no por el partido exacto para no poner
   como «falso» a un partido que quizá también lo defiende; el autor exacto se enseña después de cada respuesta. */
"use strict";
(function(){
const {BLIND} = SE;
const SITE = "https://votasinetiquetas.es";
const KEY = "sinetiquetas-29n-juego";
const TEST_KEY = "sinetiquetas-29n-v1";
const SIDES = [
  ["izq", "De la izquierda", "PSOE, Sumar, Podemos…"],
  ["der", "De la derecha", "PP, Vox, Se Acabó La Fiesta…"],
  ["trans", "De los dos lados a la vez", "partidos opuestos que coinciden"]
];
const SIDE = Object.fromEntries(SIDES.map(s=>[s[0], s[1]]));
const app = document.getElementById("juego");
let G = {stage:"intro", i:0, picks:{}};
let cardOpts = {format:"story", tone:"pink"}, cardFile = null, cardUrl = null, cardSeq = 0;

function store(){ try{ localStorage.setItem(KEY, JSON.stringify({done:true, score:score(), at:Date.now()})); }catch(e){} }
function seenInTest(){ try{ const s = JSON.parse(localStorage.getItem(TEST_KEY)); return !!(s && (s.completed || Object.keys(s.blind||{}).length)); }catch(e){ return false; } }
const score = () => BLIND.filter(b=>G.picks[b.id]===b.side).length;
const top = () => window.scrollTo({top:0});

function render(){ ({intro, q, end})[G.stage](); }

function intro(){
  app.innerHTML = `
  <section class="hero hero-card tone-pink rays juego-hero">
    <img class="stk test-runner" src="/img/ilus/magnifier.webp" alt="" width="640" height="640">
    <p class="eyebrow">¿Quién sabe más de política? · 2 minutos</p>
    <h1>¿De quién es?</h1>
    <p class="lede">Nueve medidas reales, sacadas de programas electorales y de decisiones de gobierno, sin firma. Di de qué lado crees que viene cada una. Al final, tu nota, para retar a quien quieras.</p>
    <div class="row"><button class="btn" id="go">Empezar</button><a class="btn link" href="/test/">Prefiero hacer el test completo</a></div>
    <p class="small muted">No se envía nada y no cuenta para la muestra.</p>
  </section>
  ${seenInTest() ? `<div class="notice"><b>Ya has hecho el test:</b> son las mismas nueve propuestas del final, así que quizá recuerdes de quién eran. Juega igualmente, o reta a alguien que no lo haya hecho.</div>`
                 : `<div class="notice"><b>Antes de jugar:</b> son las mismas nueve propuestas del final del test. Si luego lo haces, ya sabrás de quién son; no pasa nada, porque esa parte no cuenta para tu resultado.</div>`}`;
  document.getElementById("go").onclick = ()=>{ G = {stage:"q", i:0, picks:{}}; render(); top(); };
}

function q(){
  const b = BLIND[G.i], pick = G.picks[b.id], answered = pick !== undefined, ok = pick === b.side;
  app.innerHTML = `
  <div class="progress" aria-hidden="true"><div style="width:${((G.i + (answered?1:0))/BLIND.length*100).toFixed(1)}%"></div></div>
  <div class="qmeta"><span class="eyebrow">Propuesta ${G.i+1} de ${BLIND.length}</span><span class="eyebrow">Llevas ${score()} de ${G.i + (answered?1:0)}</span></div>
  <article class="sheet juego-q">
    <p class="eyebrow">¿De quién es?</p>
    <p class="qtext">${b.text}</p>
    <div class="opts three juego-opts" role="group" aria-label="De qué lado viene">
      ${SIDES.map(([id,l,h])=>`<button class="opt${answered && id===b.side ? " right" : ""}${answered && id===pick && !ok ? " wrong" : ""}" data-s="${id}" aria-pressed="${pick===id}" ${answered?"disabled":""}><span class="box"></span><span><b>${l}</b><small>${h}</small></span></button>`).join("")}
    </div>
    ${answered ? `<div class="juego-reveal ${ok?"ok":"ko"}" role="status"><p class="juego-verdict">${ok ? "¡Bien!" : "No era de ahí."}</p><p><b>${b.who}</b>. ${b.detail}</p></div>` : ""}
  </article>
  <div class="qnav"><button class="btn link" id="exit">← Salir</button>${answered ? `<button class="btn" id="next">${G.i < BLIND.length-1 ? "Siguiente →" : "Ver mi nota"}</button>` : ""}</div>`;
  app.querySelectorAll("[data-s]").forEach(el=> el.onclick = ()=>{ G.picks[b.id] = el.dataset.s; render(); });
  document.getElementById("exit").onclick = ()=>{ G.stage = "intro"; render(); top(); };
  const n = document.getElementById("next");
  if(n){ n.onclick = ()=>{ if(G.i < BLIND.length-1){ G.i++; } else { G.stage = "end"; store(); } render(); top(); }; n.focus({preventScroll:true}); }
}

function verdict(s){
  if(s === 9) return "Las has clavado todas. Muy poca gente lo consigue.";
  if(s >= 6) return "Se te da bien. Aun así, alguna te ha sorprendido.";
  if(s >= 3) return "Sin la firma, cuesta más de lo que parece.";
  return "Sin siglas, las ideas se parecen más de lo que creemos.";
}
function shareText(s){ return `¿Quién sabe más de política? En «¿De quién es?» he acertado ${s} de 9 propuestas reales sin firma. ¿Me superas? Son 2 minutos:`; }
function end(){
  const s = score();
  app.innerHTML = `
  <section class="juego-end">
    <p class="eyebrow">Tu nota</p>
    <h1><span class="juego-score">${s}/${BLIND.length}</span></h1>
    <p class="lede">${verdict(s)}</p>
    <div class="sharecard" id="jCard" data-fmt="${cardOpts.format}">
      <div class="sharecard-prev"><img id="jPrev" alt="Vista previa de la tarjeta «¿Me superas?»" hidden></div>
      <div class="sharecard-body">
        <p class="eyebrow">¿Quién sabe más de política?</p>
        <h2>Reta a tus amigos: ¿te superan?</h2>
        <p class="small muted">Una tarjeta con tu nota para tus historias, o el enlace por WhatsApp. No dice qué piensas, solo cuántas has acertado.</p>
        <div class="seg" role="group" aria-label="Formato">${Object.entries(SEShare.FORMATS).map(([id,f])=>`<button class="chip" data-fmt="${id}" aria-pressed="${id===cardOpts.format}">${f.label}</button>`).join("")}</div>
        <div class="swatches" role="group" aria-label="Color de fondo">${Object.entries(SEShare.TONES).map(([id,t])=>`<button class="sw" data-tone="${id}" style="--sw:${t.bg}" aria-pressed="${id===cardOpts.tone}" aria-label="${t.label}" title="${t.label}"></button>`).join("")}</div>
        <div class="row"><button class="btn" id="jShare" hidden>Compartir tarjeta</button><button class="btn ghost" id="jSave">Descargar tarjeta</button><a class="btn ghost" id="jWa" href="https://wa.me/?text=${encodeURIComponent(shareText(s)+" "+SITE+"/juego/")}" target="_blank" rel="noopener">WhatsApp</a></div>
        <p class="small" id="jMsg" aria-live="polite"></p>
      </div>
    </div>
    <div class="juego-next card-pop sky">
      <p class="eyebrow">Ahora, lo que de verdad cuenta</p>
      <h2>¿Y tú, con quién coincides?</h2>
      <p>El test completo son 36 preguntas sobre medidas concretas, sin siglas. Al final sabrás con qué partido coincides, en qué sí y en qué no.</p>
      <div class="row"><a class="btn" href="/test/">Haz el test · 15 min</a><button class="btn link" id="again">Jugar otra vez</button></div>
    </div>
    <h2 class="juego-list-h">Las nueve, destapadas</h2>
    <div class="blindgrid">${BLIND.map(b=>{ const p = G.picks[b.id], ok = p===b.side; return `<div class="bl"><div><p>${b.text}</p><p class="you">${ok ? "Acertaste" : "Dijiste: "+(SIDE[p]||"—").toLowerCase()}</p></div><p class="orig"><b>${b.who}</b>${b.detail}</p></div>`; }).join("")}</div>
  </section>`;
  document.getElementById("again").onclick = ()=>{ G = {stage:"q", i:0, picks:{}}; render(); top(); };
  drawCard(s);
}
async function drawCard(s){
  const box = document.getElementById("jCard"); if(!box) return;
  box.dataset.fmt = cardOpts.format;
  box.querySelectorAll("[data-fmt]").forEach(b=>{ b.setAttribute("aria-pressed", b.dataset.fmt===cardOpts.format); b.onclick = ()=>{ cardOpts.format = b.dataset.fmt; drawCard(s); }; });
  box.querySelectorAll("[data-tone]").forEach(b=>{ b.setAttribute("aria-pressed", b.dataset.tone===cardOpts.tone); b.onclick = ()=>{ cardOpts.tone = b.dataset.tone; drawCard(s); }; });
  const prev = document.getElementById("jPrev"), msg = document.getElementById("jMsg"), sh = document.getElementById("jShare"), sv = document.getElementById("jSave");
  sv.onclick = ()=>{ if(!cardUrl) return; const a = document.createElement("a"); a.href = cardUrl; a.download = cardFile.name; document.body.appendChild(a); a.click(); a.remove(); };
  sh.onclick = async ()=>{ try{ await navigator.share({files:[cardFile], title:"¿Me superas?", text:shareText(s)+" "+SITE+"/juego/"}); }catch(err){ if(!err || err.name!=="AbortError") sv.click(); } };
  const seq = ++cardSeq;
  try{
    const canvas = await SEShare.drawQuiz(document.createElement("canvas"), {score:s, total:BLIND.length}, cardOpts);
    const blob = await SEShare.toBlob(canvas);
    if(seq !== cardSeq || !document.body.contains(prev)) return;
    if(cardUrl) URL.revokeObjectURL(cardUrl);
    cardUrl = URL.createObjectURL(blob);
    cardFile = new File([blob], `de-quien-es-${s}-de-9.png`, {type:"image/png"});
    prev.src = cardUrl; prev.hidden = false;
    const canFiles = !!(navigator.canShare && navigator.canShare({files:[cardFile]}));
    sh.hidden = !canFiles; sv.className = canFiles ? "btn ghost" : "btn";
  }catch(err){ if(seq !== cardSeq) return; msg.className = "small status-err"; msg.textContent = "Este navegador no ha podido crear la tarjeta. Usa el botón de WhatsApp."; }
}
render();
})();
