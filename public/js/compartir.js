/* Sin Etiquetas · imagen para compartir el resultado.
   Se dibuja en un <canvas> dentro del navegador: no se envía ni se sube nada a ningún servidor.
   Usa el lenguaje de los reels (amarillo, rosa o celeste con rayos, Inter 800, Caveat y pegatinas),
   pero todas las barras van en negro: ningún partido tiene color propio. */
(function(root){
"use strict";
const INK = "#111111";
const TONES = {
  yel:  {bg:"#FFD23F", ray:"#FFE27A", label:"Amarillo"},
  pink: {bg:"#F49AC1", ray:"#F7B3D2", label:"Rosa"},
  sky:  {bg:"#8EC5F2", ray:"#A9D3F6", label:"Celeste"}
};
const FORMATS = {
  story:  {w:1080, h:1920, label:"Historia", file:"historia"},
  square: {w:1080, h:1080, label:"Cuadrada", file:"cuadrada"}
};
const ILUS = "/img/ilus/";

/* ---------- carga de fuentes y pegatinas (una sola vez) ---------- */
const imgs = {};
function loadImg(name){
  return imgs[name] || (imgs[name] = new Promise((res, rej)=>{ const i = new Image(); i.onload = ()=>res(i); i.onerror = rej; i.src = ILUS + name + ".webp"; }));
}
let fontsReady = null;
function loadFonts(){
  if(!fontsReady) fontsReady = document.fonts && document.fonts.load
    ? Promise.all(["800 80px Inter", "600 40px Inter", "700 60px Caveat"].map(f=>document.fonts.load(f))).catch(()=>{})
    : Promise.resolve();
  return fontsReady;
}

/* ---------- utilidades de dibujo ---------- */
function font(ctx, w, px, fam, ls){
  ctx.font = `${w} ${px}px ${fam==="hand" ? '"Caveat", "Comic Sans MS", cursive' : '"Inter", system-ui, -apple-system, sans-serif'}`;
  if("letterSpacing" in ctx) ctx.letterSpacing = (ls ? Math.round(px*ls*10)/10 : 0) + "px";
}
function rrect(ctx, x, y, w, h, r){
  r = Math.min(r, h/2, w/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath();
}
function rays(ctx, cx, cy, R, color){
  ctx.fillStyle = color;
  for(let a = 0; a < 360; a += 18){
    const a0 = (a-90)*Math.PI/180, a1 = (a+7-90)*Math.PI/180;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.fill();
  }
}
/* tamaño de letra más grande (≤ px, ≥ min) con el que el texto cabe en maxW */
function fit(ctx, text, maxW, w, px, min, fam, ls){
  for(let s = px; s >= min; s -= 2){ font(ctx, w, s, fam, ls); if(ctx.measureText(text).width <= maxW) return s; }
  font(ctx, w, min, fam, ls); return min;
}
function wrap(ctx, text, maxW){
  const words = text.split(" "), out = []; let line = "";
  for(const wd of words){ const t = line ? line+" "+wd : wd; if(line && ctx.measureText(t).width > maxW){ out.push(line); line = wd; } else line = t; }
  if(line) out.push(line);
  return out;
}
function sticker(ctx, img, x, y, w, deg, s){
  const h = w * img.height / img.width;
  ctx.save();
  ctx.translate(x + w/2, y + h/2); ctx.rotate(deg*Math.PI/180);
  ctx.shadowColor = "rgba(17,17,17,.14)"; ctx.shadowOffsetY = 10*s; ctx.shadowBlur = 0;
  ctx.drawImage(img, -w/2, -h/2, w, h);
  ctx.restore();
}
/* píldora negra con texto blanco; (x, cy) = borde izquierdo y centro vertical, o borde derecho si right */
function pill(ctx, text, x, cy, px, opts){
  opts = opts || {};
  font(ctx, opts.w || 800, px, "", opts.ls || 0);
  const tw = ctx.measureText(text).width, padX = px*0.85, h = px*2.1, w = tw + padX*2;
  const x0 = opts.right ? x - w : x;
  if(opts.shadow){ ctx.fillStyle = "rgba(17,17,17,.3)"; rrect(ctx, x0, cy - h/2 + px*0.22, w, h, h/2); ctx.fill(); }
  ctx.fillStyle = opts.bg || INK; rrect(ctx, x0, cy - h/2, w, h, h/2); ctx.fill();
  ctx.fillStyle = opts.fg || "#FFFFFF"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(text, x0 + padX, cy + px*0.04);
  ctx.textBaseline = "alphabetic";
  return w;
}
function wordmark(ctx, x, y, px){
  font(ctx, 800, px, "", -0.05);
  ctx.fillStyle = INK; ctx.textAlign = "left";
  const lh = px*0.95;
  ctx.fillText("Sin", x, y + px*0.78);
  ctx.fillText("Etiquetas", x, y + px*0.78 + lh);
  const w = ctx.measureText("Etiquetas").width;
  ctx.strokeStyle = INK; ctx.lineWidth = px*0.055; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x + w + px*0.18, y + px*1.78); ctx.lineTo(x + w + px*0.58, y - px*0.04); ctx.stroke();
}
/* «en el test Sin Etiquetas», con rotulador blanco detrás de «Sin Etiquetas» */
function testLine(ctx, x, base, maxW, px, min){
  const a = "en el test ", b = "Sin Etiquetas";
  const s = fit(ctx, a + b, maxW, 800, px, min, "", -0.045);
  const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
  ctx.fillStyle = "rgba(255,255,255,.9)";
  rrect(ctx, x + wa - s*0.1, base - s*0.74, wb + s*0.2, s*0.86, s*0.1); ctx.fill();
  ctx.fillStyle = INK; ctx.textAlign = "left";
  ctx.fillText(a + b, x, base);
}
function hand(ctx, text, x, y, px, deg){
  ctx.save(); ctx.translate(x, y); ctx.rotate(deg*Math.PI/180);
  font(ctx, 700, px, "hand"); ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.fillText(text, 0, 0);
  ctx.restore();
}
function eyebrow(ctx, text, x, y, px){
  font(ctx, 800, px, "", 0.12); ctx.fillStyle = "rgba(17,17,17,.62)"; ctx.textAlign = "left"; ctx.fillText(text.toUpperCase(), x, y);
}
function bar(ctx, x, y, w, h, frac){
  ctx.fillStyle = "rgba(17,17,17,.1)"; rrect(ctx, x, y, w, h, h/2); ctx.fill();
  const f = Math.max(0, Math.min(1, frac));
  if(f > 0){ ctx.fillStyle = INK; rrect(ctx, x, y, Math.max(h, w*f), h, h/2); ctx.fill(); }
}
/* número grande con el «%» (o «/20») más pequeño, alineado a la derecha en xr */
function bigNum(ctx, num, unit, xr, base, px){
  font(ctx, 800, px*0.5, "", -0.02); const wu = ctx.measureText(unit).width;
  ctx.fillStyle = INK; ctx.textAlign = "right"; ctx.fillText(unit, xr, base);
  font(ctx, 800, px, "", -0.05); ctx.fillText(num, xr - wu - px*0.06, base);
  const wn = ctx.measureText(num).width;
  ctx.textAlign = "left";
  return wn + wu + px*0.06;
}
const shortName = n => n.replace(/\s*\(.*\)\s*$/, "");

/* ---------- contenido de la tarjeta blanca ----------
   Devuelve la altura que ocupa; si draw es false, solo la calcula. */
function cardBody(ctx, d, x, y, w, k, sq, draw){
  const pad = 52*k, inner = w - pad*2;
  let cy = y + pad;
  const note = (txt, px)=>{
    font(ctx, 600, px, "", -0.01);
    const lines = wrap(ctx, txt, inner);
    cy += px*0.6;
    lines.forEach(l=>{ cy += px*1.3; if(draw){ ctx.fillStyle = "rgba(17,17,17,.62)"; ctx.textAlign = "left"; ctx.fillText(l, x+pad, cy); } });
  };
  if(!d.blackout){
    cy += 26*k; if(draw) eyebrow(ctx, "Coincidencia con mis respuestas", x+pad, cy, 24*k);
    cy += 22*k;
    const rowH = (sq ? 126 : 150)*k;
    d.parties.forEach((p, i)=>{
      const top = cy + 18*k;
      if(draw){
        const big = (sq ? 78 : 100)*k;
        const nw = bigNum(ctx, String(p.pct), " %", x+w-pad, top + big*0.82, big);
        // número de puesto en un círculo
        const r = 26*k, cx = x+pad+r, ccy = top + big*0.5;
        ctx.fillStyle = d.tone.bg; ctx.beginPath(); ctx.arc(cx, ccy, r, 0, Math.PI*2); ctx.fill();
        ctx.lineWidth = 4*k; ctx.strokeStyle = INK; ctx.stroke();
        font(ctx, 800, 30*k); ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i+1), cx, ccy + 1*k);
        ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
        const nm = shortName(p.name);
        fit(ctx, nm, inner - 64*k - nw - 24*k, 800, (sq ? 46 : 52)*k, 28*k, "", -0.04);
        ctx.fillText(nm, x+pad+64*k, top + big*0.5 + 17*k);
        bar(ctx, x+pad, top + big + 8*k, inner, (sq ? 20 : 24)*k, p.pct/100);
      }
      cy += rowH;
    });
    note("Cuánto se parecen mis respuestas a lo que defiende cada partido. No es una recomendación de voto.", (sq ? 22 : 26)*k);
  } else {
    const showThemes = d.themes.length > 0;
    const showAxes = d.axes.length > 0 && (!sq || !showThemes);
    if(showThemes){
      cy += 26*k; if(draw) eyebrow(ctx, "Lo que más me importa", x+pad, cy, 24*k);
      cy += 18*k;
      const rowH = (sq ? 112 : 108)*k;
      d.themes.forEach(t=>{
        const top = cy + 16*k, big = (sq ? 72 : 66)*k;
        if(draw){
          const nw = bigNum(ctx, String(t.pts), "/" + d.budget, x+w-pad, top + big*0.8, big);
          fit(ctx, t.name, inner - nw - 24*k, 800, (sq ? 44 : 46)*k, 26*k, "", -0.04);
          ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.fillText(t.name, x+pad, top + big*0.5 + 16*k);
          bar(ctx, x+pad, top + big + 4*k, inner, 20*k, t.pts/d.budget);
        }
        cy += rowH;
      });
    }
    if(showAxes){
      cy += (showThemes ? 40 : 26)*k; if(draw) eyebrow(ctx, "Dónde me sitúo", x+pad, cy, 24*k);
      cy += 12*k;
      const rowH = 102*k;
      d.axes.forEach(a=>{
        const top = cy + 20*k;
        if(draw){
          font(ctx, 800, 32*k, "", -0.03); ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.fillText(a.label, x+pad, top + 26*k);
          font(ctx, 600, 22*k); ctx.fillStyle = "rgba(17,17,17,.62)";
          const ly = top + 86*k;
          ctx.fillText(a.l, x+pad, ly); ctx.textAlign = "right"; ctx.fillText(a.r, x+w-pad, ly); ctx.textAlign = "left";
          const lx0 = x+pad, lx1 = x+w-pad, yy = top + 50*k;
          ctx.strokeStyle = "rgba(17,17,17,.35)"; ctx.lineWidth = 4*k; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(lx0, yy); ctx.lineTo(lx1, yy); ctx.stroke();
          [0, .25, .5, .75, 1].forEach(t=>{ const tx = lx0 + (lx1-lx0)*t; ctx.beginPath(); ctx.moveTo(tx, yy-9*k); ctx.lineTo(tx, yy+9*k); ctx.stroke(); });
          const ux = lx0 + (lx1-lx0)*(Math.max(-1, Math.min(1, a.v))+1)/2, m = 13*k;
          ctx.strokeStyle = INK; ctx.lineWidth = 8*k;
          ctx.beginPath(); ctx.moveTo(ux-m, yy-m); ctx.lineTo(ux+m, yy+m); ctx.moveTo(ux+m, yy-m); ctx.lineTo(ux-m, yy+m); ctx.stroke();
        }
        cy += rowH;
      });
    }
    note("Sin partidos hasta que cierren los colegios el 29N.", (sq ? 22 : 26)*k);
  }
  return cy + pad - y;
}
function card(ctx, d, x, y, w, k, sq){
  const h = cardBody(ctx, d, x, y, w, k, sq, false);
  ctx.fillStyle = INK; rrect(ctx, x, y + 14*k, w, h, 40*k); ctx.fill();
  ctx.fillStyle = "#FFFFFF"; rrect(ctx, x, y, w, h, 40*k); ctx.fill();
  ctx.lineWidth = 5*k; ctx.strokeStyle = INK; ctx.stroke();
  cardBody(ctx, d, x, y, w, k, sq, true);
  return h;
}

/* ---------- composición ---------- */
async function draw(canvas, data, opts){
  const fmt = FORMATS[opts.format] || FORMATS.story, tone = TONES[opts.tone] || TONES.yel;
  const blackout = !!data.blackout;
  const [girl, prop] = await Promise.all([loadImg("chica_movil"), loadImg(blackout ? "tag" : "magnifier"), loadFonts()]);
  const W = fmt.w, H = fmt.h, sq = opts.format === "square", k = 1;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const d = Object.assign({}, data, {tone});

  ctx.fillStyle = tone.bg; ctx.fillRect(0, 0, W, H);
  rays(ctx, W/2, sq ? H*0.55 : H*0.47, Math.hypot(W, H), tone.ray);

  if(!sq){
    // Historia (1080×1920). Lo importante queda entre y≈170 y y≈1690, fuera de las barras de Instagram.
    const M = 80;
    wordmark(ctx, M, 172, 58);
    pill(ctx, "GENERALES · 29N", W - M, 222, 26, {ls:0.12, right:true});
    sticker(ctx, prop, blackout ? 812 : 836, blackout ? 520 : 548, blackout ? 190 : 200, blackout ? -14 : 12, 1);
    fit(ctx, "Mi resultado", 900, 800, 160, 110, "", -0.055);
    ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.fillText("Mi resultado", M - 6, 478);
    testLine(ctx, M, 572, 760, 72, 54);
    // en la veda, con temas y ejes la tarjeta es más alta: se quita la línea manuscrita para que quepa el pie
    const tall = blackout && d.themes.length && d.axes.length;
    if(!tall) hand(ctx, blackout ? "lo que me importa, sin siglas" : "con quién coinciden mis respuestas", M + 4, 660, 54, -3);
    const cy = tall ? 636 : 720;
    const ch = card(ctx, d, 70, cy, W - 140, k, false);
    const foot = Math.max(cy + ch + 90, 1500);
    sticker(ctx, girl, 664, Math.max(cy + ch + 40, foot - 170), 360, 4, 1);
    hand(ctx, "¿Y tú? Haz el test →", M + 2, foot, 64, -3);
    pill(ctx, "votasinetiquetas.es", M, foot + 82, 46, {shadow:true});
  } else {
    // Cuadrada (1080×1080)
    const M = 64;
    wordmark(ctx, M, 60, 44);
    pill(ctx, "GENERALES · 29N", W - M, 98, 21, {ls:0.12, right:true});
    sticker(ctx, prop, 850, 150, 160, blackout ? -14 : 12, 1);
    fit(ctx, "Mi resultado", 740, 800, 104, 80, "", -0.055);
    ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.fillText("Mi resultado", M - 4, 256);
    testLine(ctx, M, 318, 740, 50, 40);
    const cy = 356;
    const ch = card(ctx, d, 52, cy, W - 104, k, true);
    const fy = Math.min(H - 56, cy + ch + 80);
    pill(ctx, "votasinetiquetas.es", W - M, fy, 34, {shadow:true, right:true});
    hand(ctx, "¿Y tú? Haz el test →", M, fy + 14, 50, -3);
  }
  return canvas;
}

/* ---------- Pegatina «He votado sin etiquetas» ----------
   No lleva nada de lo que piensa la persona: solo que ha participado, su número redondeado
   («entre las primeras 150») y una huella dibujada a partir del recibo y de una clave que solo está en su navegador.
   data: {first: 150, code: "7F3A·91C2", bytes: Uint8Array(32)} */
/* huella: anillos concéntricos cortados según los bytes, como una huella dactilar */
function fingerprint(ctx, cx, cy, R, bytes, s){
  ctx.save();
  ctx.strokeStyle = INK; ctx.lineCap = "round"; ctx.lineWidth = R*0.055;
  for(let i = 0; i < 7; i++){
    const r = R*(0.16 + i*0.135), b0 = bytes[i*4], b1 = bytes[i*4+1], b2 = bytes[i*4+2], b3 = bytes[i*4+3];
    const gaps = 1 + b1 % 3, start = b0/255*Math.PI*2, seg = Math.PI*2/gaps;
    for(let g = 0; g < gaps; g++){
      const gap = 0.28 + ((g ? b3 : b2) % 40)/100;
      const a0 = start + g*seg + gap/2, a1 = start + (g+1)*seg - gap/2;
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
    }
  }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, R*0.06, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function stickerCard(ctx, d, x, y, w, h, k, tone, sq){
  ctx.save();
  ctx.translate(x + w/2, y + h/2); ctx.rotate(-1.5*Math.PI/180); ctx.translate(-w/2, -h/2);
  ctx.fillStyle = INK; rrect(ctx, 0, 16*k, w, h, 56*k); ctx.fill();
  ctx.fillStyle = "#FFFFFF"; rrect(ctx, 0, 0, w, h, 56*k); ctx.fill();
  ctx.lineWidth = 6*k; ctx.strokeStyle = INK; ctx.stroke();
  const pad = 64*k, inner = w - pad*2;
  let cy = pad + 30*k;
  eyebrow(ctx, "Generales · 29 de noviembre de 2026", pad, cy, 26*k);
  // «He votado / sin etiquetas», con rotulador del color del fondo detrás de «sin etiquetas»
  const big = fit(ctx, "sin etiquetas", inner, 800, (sq ? 120 : 150)*k, 80*k, "", -0.055);
  cy += big*1.05;
  ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.fillText("He votado", pad - 4*k, cy);
  cy += big*1.0;
  const wb = ctx.measureText("sin etiquetas").width;
  ctx.fillStyle = tone.bg; rrect(ctx, pad - big*0.1, cy - big*0.74, wb + big*0.2, big*0.88, big*0.12); ctx.fill();
  ctx.fillStyle = INK; ctx.fillText("sin etiquetas", pad - 4*k, cy);
  cy += (sq ? 66 : 84)*k;
  hand(ctx, "en el test, sin ver siglas", pad, cy, (sq ? 46 : 56)*k, -2);
  // huella y número
  const R = (sq ? 118 : 150)*k;
  const fy = cy + (sq ? 40 : 56)*k + R, fx = sq ? pad + R : w/2;
  ctx.fillStyle = tone.ray; ctx.beginPath(); ctx.arc(fx, fy, R*1.08, 0, Math.PI*2); ctx.fill();
  fingerprint(ctx, fx, fy, R, d.bytes, k);
  if(!sq){
    font(ctx, 700, 28*k, "", 0.08); ctx.fillStyle = "rgba(17,17,17,.62)"; ctx.textAlign = "center";
    ctx.fillText("MI HUELLA · " + d.code, w/2, fy + R + 56*k);
    cy = fy + R + 124*k;
    ctx.fillStyle = "rgba(17,17,17,.15)"; ctx.fillRect(pad, cy - 40*k, inner, 3*k);
    font(ctx, 600, 40*k, "", -0.02); ctx.fillStyle = INK; ctx.textAlign = "left";
    ctx.fillText("Entre las primeras", pad, cy + 20*k);
    const pn = fmt(d.first) + " personas";
    fit(ctx, pn, inner, 800, 116*k, 70*k, "", -0.05); ctx.fillText(pn, pad - 4*k, cy + 128*k);
  } else {
    const tx = pad + R*2 + 48*k, tw = w - tx - pad;
    font(ctx, 600, 34*k, "", -0.02); ctx.fillStyle = INK; ctx.textAlign = "left";
    ctx.fillText("Entre las", tx, fy - 54*k); ctx.fillText("primeras", tx, fy - 14*k);
    const pn = fmt(d.first);
    fit(ctx, pn, tw, 800, 110*k, 60*k, "", -0.05); ctx.fillText(pn, tx - 4*k, fy + 84*k);
    font(ctx, 600, 34*k, "", -0.02); ctx.fillText("personas", tx, fy + 128*k);
    font(ctx, 700, 22*k, "", 0.08); ctx.fillStyle = "rgba(17,17,17,.62)";
    ctx.fillText("MI HUELLA · " + d.code, pad, fy + R + 56*k);
  }
  ctx.restore();
}
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
async function drawSticker(canvas, data, opts){
  const fmtD = FORMATS[opts.format] || FORMATS.story, tone = TONES[opts.tone] || TONES.sky;
  const [urna] = await Promise.all([loadImg("urna"), loadFonts()]);
  const W = fmtD.w, H = fmtD.h, sq = opts.format === "square", k = 1;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = tone.bg; ctx.fillRect(0, 0, W, H);
  rays(ctx, W/2, H*0.5, Math.hypot(W, H), tone.ray);
  if(!sq){
    const M = 80;
    wordmark(ctx, M, 172, 58);
    pill(ctx, "GENERALES · 29N", W - M, 222, 26, {ls:0.12, right:true});
    // Igual que la imagen del resultado: lo importante, entre y≈170 y y≈1690 (fuera de las barras de Instagram)
    stickerCard(ctx, data, 70, 340, W - 140, 1160, k, tone, false);
    sticker(ctx, urna, 770, 280, 230, 10, 1);
    hand(ctx, "No dice qué pienso: solo que he participado.", M + 2, 1588, 48, -2);
    pill(ctx, "votasinetiquetas.es · ¿Y tú?", M, 1660, 42, {shadow:true});
  } else {
    const M = 60;
    wordmark(ctx, M, 52, 42);
    pill(ctx, "GENERALES · 29N", W - M, 88, 20, {ls:0.12, right:true});
    stickerCard(ctx, data, 46, 160, W - 92, 800, k, tone, true);
    sticker(ctx, urna, 860, 112, 160, 10, 1);
    pill(ctx, "votasinetiquetas.es · ¿Y tú?", W - M, 1030, 30, {shadow:true, right:true});
  }
  return canvas;
}

function toBlob(canvas){
  return new Promise((res, rej)=> canvas.toBlob(b=> b ? res(b) : rej(new Error("toBlob")), "image/png"));
}

root.SEShare = {TONES, FORMATS, draw, drawSticker, toBlob};
})(window);
