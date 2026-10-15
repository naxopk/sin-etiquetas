"use strict";
/* Ponderación por raking (ajuste proporcional iterativo).
   Idea: si en la muestra hay el doble de jóvenes de los que hay en el censo, cada joven cuenta la mitad.
   Se ajusta una dimensión cada vez (comunidad, edad, sexo, voto en 2023) y se repite hasta que todas
   cuadran a la vez. Después se recortan los pesos extremos para que nadie cuente más de 5 veces
   ni menos de un quinto, porque unos pocos pesos enormes harían los resultados muy inestables.

   Quien no responde una pregunta opcional queda en la categoría «sin dato» de esa dimensión:
   esa parte no se ajusta y el resto se reparte según el censo. */

/* cells: [{region, age, sex, vote23, n}] (personas idénticas en esas 4 variables comparten peso)
   margins: {dim: {categoría: proporción}} */
function rake(cells, margins, opts = {}) {
  const { minKnown = 100, lo = 0.2, hi = 5, maxIter = 200, tol = 1e-4 } = opts;
  const N = cells.reduce((s, c) => s + c.n, 0);
  const w = cells.map(() => 1);
  const out = { weights: w, applied: false, dims: [], skipped: [], iterations: 0, converged: true, maxDeviation: 0 };
  if (!N) return out;

  // Dimensiones con suficientes datos y objetivos limitados a categorías presentes en la muestra
  const targets = {};
  for (const [dim, cats] of Object.entries(margins)) {
    const known = cells.reduce((s, c) => s + (c[dim] in cats ? c.n : 0), 0);
    if (known < minKnown) { out.skipped.push({ dim, reason: `menos de ${minKnown} respuestas con este dato`, known }); continue; }
    const present = Object.keys(cats).filter((k) => cells.some((c) => c[dim] === k && c.n > 0));
    const missing = Object.keys(cats).filter((k) => !present.includes(k));
    const tot = present.reduce((s, k) => s + cats[k], 0);
    targets[dim] = Object.fromEntries(present.map((k) => [k, cats[k] / tot]));
    out.dims.push({ dim, known, missing });
  }
  const dims = Object.keys(targets);
  if (!dims.length) return out;
  out.applied = true;

  const deviation = () => {
    let max = 0;
    for (const dim of dims) {
      let unk = 0, tot = 0; const by = {};
      cells.forEach((c, i) => { const x = c.n * w[i]; tot += x; if (c[dim] in targets[dim]) by[c[dim]] = (by[c[dim]] || 0) + x; else unk += x; });
      for (const [k, t] of Object.entries(targets[dim])) max = Math.max(max, Math.abs((by[k] || 0) / (tot - unk) - t));
    }
    return max;
  };

  for (let it = 1; it <= maxIter; it++) {
    for (const dim of dims) {
      let unk = 0, tot = 0; const by = {};
      cells.forEach((c, i) => { const x = c.n * w[i]; tot += x; if (c[dim] in targets[dim]) by[c[dim]] = (by[c[dim]] || 0) + x; else unk += x; });
      const knownTot = tot - unk;
      cells.forEach((c, i) => { if (c[dim] in targets[dim] && by[c[dim]] > 0) w[i] *= (targets[dim][c[dim]] * knownTot) / by[c[dim]]; });
    }
    // Media de pesos = 1 y recorte de extremos
    const mean = cells.reduce((s, c, i) => s + c.n * w[i], 0) / N;
    for (let i = 0; i < w.length; i++) w[i] = Math.min(hi, Math.max(lo, w[i] / mean));
    out.iterations = it;
    out.maxDeviation = deviation();
    if (out.maxDeviation < tol) break;
  }
  out.converged = out.maxDeviation < 0.01;

  const sw = cells.reduce((s, c, i) => s + c.n * w[i], 0);
  const sw2 = cells.reduce((s, c, i) => s + c.n * w[i] * w[i], 0);
  out.neff = sw2 ? (sw * sw) / sw2 : 0;            // tamaño de muestra efectivo (Kish)
  out.deff = out.neff ? N / out.neff : 1;          // efecto de diseño: cuánto «cuesta» ponderar
  out.wmin = Math.min(...w); out.wmax = Math.max(...w);
  out.trimmedShare = cells.reduce((s, c, i) => s + (w[i] <= lo + 1e-9 || w[i] >= hi - 1e-9 ? c.n : 0), 0) / N;
  out.targets = targets;
  return out;
}

/* Distribución de una dimensión en la muestra, con y sin pesos */
function distribution(cells, weights, dim) {
  const raw = {}, wtd = {}; let n = 0, wn = 0;
  cells.forEach((c, i) => {
    raw[c[dim]] = (raw[c[dim]] || 0) + c.n; n += c.n;
    wtd[c[dim]] = (wtd[c[dim]] || 0) + c.n * weights[i]; wn += c.n * weights[i];
  });
  const r = {}; for (const k of Object.keys(raw)) r[k] = { n: raw[k], raw: raw[k] / n, weighted: wtd[k] / wn };
  return r;
}

/* Media ponderada de una suma por celda: Σ w·suma / Σ w·n */
function wmean(cells, weights, sumKey, nKey = "n") {
  let num = 0, den = 0;
  cells.forEach((c, i) => { num += weights[i] * (c[sumKey] || 0); den += weights[i] * (c[nKey] || 0); });
  return den ? num / den : null;
}

/* Margen orientativo al 95 % de una proporción: solo recoge el azar del muestreo, no el sesgo de autoselección */
function moe(p, neff) { return neff > 0 && p !== null ? 1.96 * Math.sqrt((p * (1 - p)) / neff) : null; }

module.exports = { rake, distribution, wmean, moe };
