/* Sin Etiquetas · «Compárate con un amigo».
   Las respuestas viajan solo dentro del enlace, después de «#» (esa parte no llega a ningún servidor), y no se guardan.
   El código no es un cifrado: solo hace que el enlace no se pueda leer a simple vista. Por eso quien lo abre
   ve únicamente cuánto coincidís y en qué temas, nunca las respuestas de la otra persona.
   Lo usan el navegador (window.SEReto) y las pruebas (require). Necesita shared.js. */
(function(root){
"use strict";
const SE = root.SE || (typeof require !== "undefined" ? require("./shared.js") : null);
const VERSION = 1;
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
/* huella de la lista de preguntas: si cambia el test, los enlaces viejos dejan de valer */
const QSUM = SE.QUESTIONS.map(q=>q.id).join(",").split("").reduce((s,c)=>(s*31 + c.charCodeAt(0)) & 255, 7);
const NQ = SE.QUESTIONS.length, NBYTES = Math.ceil(NQ*3/8);

function toB64(bytes){
  let out = "", acc = 0, bits = 0;
  for(const b of bytes){ acc = (acc << 8) | b; bits += 8; while(bits >= 6){ bits -= 6; out += B64[(acc >> bits) & 63]; } acc &= (1 << bits) - 1; }
  if(bits) out += B64[(acc << (6 - bits)) & 63];
  return out;
}
function fromB64(str){
  const out = []; let acc = 0, bits = 0;
  for(const ch of str){ const v = B64.indexOf(ch); if(v < 0) return null; acc = (acc << 6) | v; bits += 6; if(bits >= 8){ bits -= 8; out.push((acc >> bits) & 255); } acc &= (1 << bits) - 1; }
  return out;
}
const mask = (nonce, i) => (nonce*167 + i*59 + 101) & 255;
const check = bytes => bytes.reduce((s,b,i)=>(s + b*(i+1)) & 255, 13);

/* answers: {q1:{v:-2..2|null}, …} → código para el enlace */
function encode(answers, nonce){
  if(nonce === undefined) nonce = Math.floor(Math.random()*256);
  const packed = new Array(NBYTES).fill(0);
  SE.QUESTIONS.forEach((q, i)=>{
    const a = answers[q.id]; const v = a && typeof a.v === "number" ? a.v + 2 : 5; // 0..4 o 5 = sin responder
    for(let b = 0; b < 3; b++) if(v & (4 >> b)){ const bit = i*3 + b; packed[bit >> 3] |= 128 >> (bit & 7); }
  });
  const body = [VERSION, QSUM, nonce, ...packed.map((b,i)=>b ^ mask(nonce, i))];
  return toB64([...body, check(body)]);
}
/* código → {q1:-2..2|null, …}, o null si el enlace está roto o es de otra versión del test */
function decode(code){
  if(typeof code !== "string" || code.length > 64) return null;
  const bytes = fromB64(code.trim());
  if(!bytes || bytes.length < NBYTES + 4) return null;
  const body = bytes.slice(0, NBYTES + 3), sum = bytes[NBYTES + 3];
  if(body[0] !== VERSION || body[1] !== QSUM || check(body) !== sum) return null;
  const nonce = body[2], packed = body.slice(3).map((b,i)=>b ^ mask(nonce, i));
  const out = {};
  for(let i = 0; i < NQ; i++){
    let v = 0;
    for(let b = 0; b < 3; b++){ const bit = i*3 + b; if(packed[bit >> 3] & (128 >> (bit & 7))) v |= 4 >> b; }
    if(v > 5) return null;
    out[SE.QUESTIONS[i].id] = v === 5 ? null : v - 2;
  }
  return out;
}
/* Coincidencia entre dos personas con la misma fórmula que con los partidos, sin pesos:
   1 − |a − b| / 4 en cada pregunta que han respondido las dos. Por temas, solo con 2 preguntas en común o más. */
const MIN_COMMON = 8, MIN_THEME = 2;
function compare(mine, theirs){
  const per = {}; let sum = 0, n = 0;
  SE.QUESTIONS.forEach(q=>{
    const a = mine[q.id], b = theirs[q.id];
    const va = a && typeof a === "object" ? a.v : a, vb = b && typeof b === "object" ? b.v : b;
    if(typeof va !== "number" || typeof vb !== "number") return;
    const ag = 1 - Math.abs(va - vb)/4;
    sum += ag; n++;
    const T = per[q.t] || (per[q.t] = {s:0, n:0}); T.s += ag; T.n++;
  });
  const themes = SE.THEMES.filter(t=>per[t.id] && per[t.id].n >= MIN_THEME).map(t=>({id:t.id, name:t.name, score:per[t.id].s/per[t.id].n}))
    .sort((x,y)=>y.score - x.score);
  return {n, enough: n >= MIN_COMMON, score: n ? sum/n : null, themes};
}

const SEReto = {encode, decode, compare, MIN_COMMON};
if(typeof module !== "undefined" && module.exports) module.exports = SEReto; else root.SEReto = SEReto;
})(typeof self !== "undefined" ? self : this);
