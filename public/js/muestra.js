/* Sin Etiquetas · mapa de la muestra por comunidad («¿Cuenta tu comunidad?»).
   Sale de /api/stats (respuestas válidas por comunidad), sin datos nuevos.
   Meta de cada comunidad: lo que le toca por censo en una muestra de 1.000 respuestas, y como mínimo 30
   (con menos, no se puede corregir la muestra en esa comunidad).
   Privacidad: por debajo de 5 respuestas no se da la cifra («menos de 5»), para no señalar a nadie. */
(function(root){
"use strict";
const META = 1000, MIN_GOAL = 30, K = 5;
/* mapa de casillas: [columna, fila, etiqueta corta] */
const TILES = {
  GAL:[0,0,"Galicia","Gal."], AST:[1,0,"Asturias","Ast."], CNT:[2,0,"Cantabria","Cant."], PVA:[3,0,"P. Vasco","P. V."], NAV:[4,0,"Navarra","Nav."],
  CYL:[2,1,"Cast. y León","CyL"], RIO:[3,1,"La Rioja","Rioja"], ARA:[4,1,"Aragón","Ar."], CAT:[5,1,"Cataluña","Cat."],
  EXT:[1,2,"Extremadura","Ext."], MAD:[2,2,"Madrid","Mad."], CLM:[3,2,"Cast.-La Mancha","CLM"], VAL:[4,2,"C. Valenciana","Val."], BAL:[5,2,"Baleares","Bal."],
  AND:[2,3,"Andalucía","And."], MUR:[3,3,"Murcia","Mur."],
  CAN:[0,4,"Canarias","Can."], CEU:[2,4,"Ceuta","Ceuta"], MEL:[3,4,"Melilla","Mel."]
};
const dots = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
let cache = null;
function load(){
  if(!cache) cache = fetch("/api/stats").then(r=>r.ok ? r.json() : null).then(s=>{
    if(!s || !Array.isArray(s.regions)) return null;
    const rows = s.regions.filter(r=>r.target !== null && TILES[r.id]).map(r=>{
      const goal = Math.max(MIN_GOAL, Math.round(r.target*META));
      const small = r.n > 0 && r.n < K;
      return {id:r.id, name:r.name, short:TILES[r.id][2], n:r.n, small, goal, left:Math.max(0, goal - r.n), done:r.n >= goal, frac:Math.min(1, r.n/goal)};
    });
    return {rows, total:s.participation ? s.participation.valid : null};
  }).catch(()=>null);
  return cache;
}
const countTxt = r => r.n === 0 ? "0" : r.small ? `menos de ${K}` : dots(r.n);
const leftTxt = r => r.done ? "✓ ya cuenta" : r.small ? `más de ${dots(r.goal - K)}` : dots(r.left);
/* frase para una comunidad: «A Galicia le faltan 61 respuestas para que cuente» */
function sentence(r){
  if(r.done) return `${r.name} ya cuenta: tiene las ${dots(r.goal)} respuestas que le tocan. Que siga sumando.`;
  const art = ({PVA:"Al ", BAL:"A las ", MAD:"A la ", VAL:"A la ", MUR:"A la "})[r.id] || "A ";
  return `${art}${r.name} le faltan ${r.small ? "más de " + dots(r.goal - K) : dots(r.left)} respuestas para que cuente.`;
}
const level = r => r.done ? 4 : r.frac >= 0.5 ? 3 : r.frac >= 0.25 ? 2 : r.n > 0 ? 1 : 0;
function mapHtml(d){
  const tiles = d.rows.map(r=>{ const [c,row] = TILES[r.id];
    return `<li class="mt l${level(r)}" style="grid-column:${c+1};grid-row:${row+1}" title="${r.name}: ${countTxt(r)} de ${dots(r.goal)}"><b><span class="mt-l">${r.short}</span><span class="mt-s">${TILES[r.id][3]}</span></b><span>${r.done ? "✓" : r.small ? "&lt;" + K : dots(r.n)}<small>/${dots(r.goal)}</small></span></li>`; }).join("");
  const need = d.rows.filter(r=>!r.done).sort((a,b)=>a.frac-b.frac);
  return `<ol class="mtiles" aria-hidden="true">${tiles}</ol>
    <p class="mlegend"><span><i class="l1"></i>menos de un 25 %</span><span><i class="l2"></i>más de un 25 %</span><span><i class="l3"></i>más de la mitad</span><span><i class="l4"></i>ya cuenta</span></p>
    <details class="mlist"><summary>Ver todas las comunidades</summary>
      <table><thead><tr><th>Comunidad</th><th>Llevan</th><th>Le tocan</th><th>Le faltan</th></tr></thead><tbody>
      ${d.rows.slice().sort((a,b)=>a.frac-b.frac).map(r=>`<tr><td>${r.name}</td><td>${countTxt(r)}</td><td>${dots(r.goal)}</td><td>${leftTxt(r)}</td></tr>`).join("")}
      </tbody></table></details>
    ${need.length ? `<p class="mneed"><b>Las que más lo necesitan:</b> ${need.slice(0,3).map(r=>r.name).join(", ")}.</p>` : ""}`;
}
root.SEMuestra = {load, mapHtml, sentence, META, MIN_GOAL, K};
})(window);
