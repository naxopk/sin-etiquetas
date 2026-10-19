/* Sin Etiquetas · test exprés (necesita shared.js).
   5 preguntas del test, elegidas porque separan bien a los partidos (incluidos PP y Vox, PSOE y Sumar, y los
   partidos nacionalistas) y porque son de 5 temas distintos, con afirmaciones y dilemas en los dos sentidos.
   Las respuestas solo viven en esta página: no se guardan, no se envían y nunca se mezclan con la muestra.
   El test completo empieza de cero. */
"use strict";
(function(){
const {QUESTIONS, QMAP, REGIONS, PARTIES, THEMES, TMAP} = SE;
const PICK = ["q4", "q8", "q19", "q14", "q22"];
const LIKERT = [[-2,"Muy en desacuerdo"],[-1,"En desacuerdo"],[0,"Ni a favor ni en contra"],[1,"De acuerdo"],[2,"Muy de acuerdo"]];
const DIL = [[-2,"Claramente A"],[-1,"Más bien A"],[0,"Las dos por igual"],[1,"Más bien B"],[2,"Claramente B"]];
const SITE = "https://votasinetiquetas.es";
const app = document.getElementById("expres");
let E = {stage:"intro", region:null, i:0, answers:{}};
let timer = null;
const pct = x => Math.round(x*100);
const top = () => window.scrollTo({top:0});
function go(stage){ E.stage = stage; render(); top(); }
function render(){ ({intro, region, q, result})[E.stage](); }

function intro(){
  app.innerHTML = `
  <section class="hero hero-card tone-sky rays">
    <img class="stk test-runner" src="/img/ilus/chica_movil.webp" alt="" width="640" height="640">
    <p class="eyebrow">Test exprés · 2 minutos · 5 preguntas</p>
    <h1>Una primera pista, <em class="mk white">en 2 minutos</em></h1>
    <p class="lede">Cinco preguntas del test, de cinco temas distintos, sin siglas. Al final, una pista provisional de con qué partidos coincides. Para el resultado de verdad, el test completo.</p>
    <div class="row"><button class="btn" id="go">Empezar</button><a class="btn link" href="/test/">Prefiero el test completo</a></div>
    <p class="small muted">Tus respuestas no se guardan ni se envían: no cuentan para la muestra.</p>
  </section>`;
  document.getElementById("go").onclick = ()=>go("region");
}
function region(){
  app.innerHTML = `
  <div class="stagehead"><p class="eyebrow">Paso 1 de 2 · Dónde votas</p><h2>¿En qué comunidad votas?</h2>
    <p>Así te comparamos solo con los partidos que vas a encontrar en tu papeleta.</p></div>
  <div class="regions">${REGIONS.map(([id,n])=>`<button class="choice" data-r="${id}" aria-pressed="${E.region===id}"><span class="box"></span>${n}</button>`).join("")}</div>
  <div class="qnav"><button class="btn link" id="back">← Volver</button></div>`;
  app.querySelectorAll("[data-r]").forEach(b=> b.onclick = ()=>{ E.region = b.dataset.r; E.i = 0; go("q"); });
  document.getElementById("back").onclick = ()=>go("intro");
}
function q(){
  const qq = QMAP[PICK[E.i]], a = E.answers[qq.id], opts = qq.f==="l" ? LIKERT : DIL;
  app.innerHTML = `
  <div class="progress" aria-hidden="true"><div style="width:${(E.i/PICK.length*100).toFixed(1)}%"></div></div>
  <div class="qmeta"><span class="eyebrow">Paso 2 de 2 · Pregunta ${E.i+1} de ${PICK.length}</span><span class="eyebrow">${TMAP[qq.t].name}</span></div>
  <article class="sheet qsheet">
    ${qq.f==="d" ? `<p class="qlead">${qq.text}</p><div class="poles"><div class="pole"><span class="tag">A</span><p>${qq.a}</p></div><div class="pole"><span class="tag">B</span><p>${qq.b}</p></div></div>` : `<p class="qtext">${qq.text}</p>`}
    ${qq.ctx ? `<div class="ctx"><span class="eyebrow">Para situarte</span><p>${qq.ctx}</p></div>` : ""}
    <div class="opts" role="group" aria-label="Tu respuesta">${opts.map(([v,l])=>`<button class="opt" data-v="${v}" aria-pressed="${a===v}"><span class="box"></span><span>${l}</span></button>`).join("")}</div>
  </article>
  <div class="qnav"><button class="btn link" id="prev">← ${E.i ? "Anterior" : "Comunidad"}</button><button class="btn ghost" id="skip">${typeof a==="number" ? "Siguiente →" : "Saltar →"}</button></div>`;
  app.querySelectorAll(".opt").forEach(b=> b.onclick = ()=>{
    E.answers[qq.id] = +b.dataset.v;
    app.querySelectorAll(".opt").forEach(x=>x.setAttribute("aria-pressed", String(x===b)));
    clearTimeout(timer); timer = setTimeout(next, 280);
  });
  document.getElementById("prev").onclick = ()=>{ clearTimeout(timer); if(E.i){ E.i--; render(); } else go("region"); };
  document.getElementById("skip").onclick = next;
}
function next(){ clearTimeout(timer); if(E.i < PICK.length-1){ E.i++; render(); top(); } else go("result"); }

function result(){
  const answers = Object.fromEntries(Object.entries(E.answers).map(([id,v])=>[id, {v}]));
  const n = Object.keys(answers).length;
  const sc = SE.scoreAll(answers, {});
  const ranked = sc.parties.filter(r=>SE.eligibleIn(PARTIES[r.i], E.region)).sort((a,b)=>b.score-a.score);
  const wa = "Acabo de hacer el test exprés de Sin Etiquetas para el 29N: 5 preguntas sin siglas en 2 minutos. ¿Lo haces tú?";
  app.innerHTML = `
  <section class="expres-res">
    <p class="eyebrow">Pista provisional · ${n} de ${PICK.length} preguntas</p>
    ${n < 3 ? `<h1>Con tan pocas respuestas no hay pista</h1><p class="lede">Has respondido ${n}. Vuelve atrás y contesta alguna más, o ve directamente al test completo.</p>`
    : `<h1>Por ahora te pareces más a <span class="expres-top">${PARTIES[ranked[0].i].name}</span></h1>
    <div class="expres-warn"><b>Solo es una pista.</b> Con 5 preguntas, unos pocos puntos cambian el orden, y faltan temas que quizá te importan más. En el test completo, con 36 preguntas y tus prioridades, el resultado puede ser otro.</div>
    <div class="rank expres-rank">${ranked.slice(0,3).map((r,k)=>`<div class="r ${k===0?"first":""}"><span class="pos">${k+1}.</span><span class="nm" title="${PARTIES[r.i].name}">${PARTIES[r.i].name}</span><span class="bar"><i style="width:${pct(r.score)}%"></i></span><span class="val">${pct(r.score)} %</span>${r.cover<0.75?`<span class="flag">De este partido solo conocemos su posición en ${r.known} de tus ${n} respuestas: en el resto cuenta como neutral, como en el test completo.</span>`:""}</div>`).join("")}</div>`}
    <div class="expres-next card-pop yel">
      <p class="eyebrow">El siguiente paso</p>
      <h2>Ahora, el test completo</h2>
      <p>36 preguntas, unos 15 minutos. Repartes puntos entre los temas que te importan y, al final, ves con quién coincides, en qué sí, en qué no y por qué.</p>
      <p class="small">Empieza de cero: verás otra vez estas 5 preguntas. Lo que has contestado aquí no se guarda ni se envía, así que no cuenta para la muestra.</p>
      <div class="row"><a class="btn" href="/test/">Haz el test completo</a><button class="btn link" id="again">Repetir el exprés</button></div>
    </div>
    <p class="small muted expres-pass">¿Conoces a alguien con prisa? <a href="https://wa.me/?text=${encodeURIComponent(wa+" "+SITE+"/expres/")}" target="_blank" rel="noopener">Pásale el test exprés por WhatsApp</a>.</p>
  </section>`;
  document.getElementById("again").onclick = ()=>{ E = {stage:"region", region:E.region, i:0, answers:{}}; go("q"); };
}
render();
})();
