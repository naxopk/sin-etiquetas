"use strict";
/* Estadísticas del dashboard.
   1. La base de datos agrupa las respuestas válidas en «celdas» (misma comunidad, edad, sexo y voto en 2023)
      y suma dentro de cada celda todo lo que hace falta. Así el cálculo no depende del número de respuestas.
   2. Se ponderan las celdas por raking (lib/weighting.js).
   3. Cada cifra se publica dos veces: tal cual (bruta) y ponderada. */
const SE = require("../public/js/shared.js");
const { CONFIG, partyBlackout } = require("./config");
const { normalized, APPROXIMATE } = require("./margins");
const { rake, distribution, wmean, moe } = require("./weighting");

const P = SE.PARTIES.length, T = SE.THEMES.length, B = SE.BLIND.length, Q = SE.QUESTIONS.length;

function aggregateSql() {
  const c = ["region", "coalesce(age,'nd') as age", "coalesce(sex,'nd') as sex", "coalesce(vote23,'nd') as vote23", "count(*)::int as n"];
  SE.PARTIES.forEach((p, i) => {
    c.push(`count(*) filter (where top = '${p.id}')::int as top_${i}`);
    c.push(`coalesce(sum(affinity[${i + 1}]),0)::int as aff_${i}`);
  });
  for (let i = 0; i < T; i++) c.push(`coalesce(sum(points[${i + 1}]),0)::int as pts_${i}`);
  for (let i = 0; i < B; i++) {
    c.push(`count(blind[${i + 1}])::int as bn_${i}`);
    c.push(`count(*) filter (where blind[${i + 1}] = 1)::int as bs_${i}`);
    c.push(`count(*) filter (where blind[${i + 1}] = -1)::int as bo_${i}`);
  }
  for (let i = 0; i < Q; i++) {
    const a = `answers[${i + 1}]`;
    c.push(`count(${a})::int as qn_${i}`, `coalesce(sum(${a}),0)::int as qs_${i}`, `coalesce(sum(${a}*${a}),0)::int as qq_${i}`,
      `count(*) filter (where ${a} > 0)::int as qp_${i}`, `count(*) filter (where ${a} < 0)::int as qm_${i}`,
      `count(*) filter (where stars[${i + 1}] and ${a} is not null)::int as qd_${i}`);
  }
  c.push(`count(*) filter (where prediction is not null and prediction <> 'NS')::int as pr_n`);
  c.push(`count(*) filter (where prediction is not null and prediction <> 'NS' and prediction = top)::int as pr_hit`);
  return `select ${c.join(", ")} from responses where cardinality(flags) = 0 group by 1, 2, 3, 4`;
}
const AGG_SQL = aggregateSql();

const r4 = (x) => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 10000) / 10000);
const sumKey = (cells, k) => cells.reduce((s, c) => s + (c[k] || 0), 0);
const ratio = (a, b) => (b ? a / b : null);

async function buildStats(d, now = new Date()) {
  const [cells, totals, flagRows, byHour, byDay, seals] = await Promise.all([
    d.query(AGG_SQL),
    d.query("select count(*)::int as received, count(*) filter (where cardinality(flags) = 0)::int as valid, count(*) filter (where hour > now() - interval '24 hours' and cardinality(flags) = 0)::int as last24h from responses"),
    d.query("select f, count(*)::int as n from responses, unnest(flags) as f group by f"),
    d.query("select hour, count(*) filter (where cardinality(flags) = 0)::int as n from responses where hour > now() - interval '48 hours' group by hour order by hour"),
    d.query("select day::text as day, count(*) filter (where cardinality(flags) = 0)::int as n from responses group by day order by day"),
    d.query("select day::text as day, n, merkle_root, chain from seals order by day desc limit 10"),
  ]);

  const margins = normalized();
  const n = sumKey(cells, "n");
  const enough = n >= CONFIG.MIN_FOR_WEIGHTED;
  const R = enough ? rake(cells, margins, { minKnown: CONFIG.MIN_KNOWN_PER_DIM }) : { applied: false, weights: cells.map(() => 1), dims: [], skipped: [] };
  const w = R.applied ? R.weights : cells.map(() => 1);
  const ones = cells.map(() => 1);
  const neff = R.applied ? R.neff : n;
  const both = (sk, nk = "n") => ({ raw: r4(wmean(cells, ones, sk, nk)), weighted: R.applied ? r4(wmean(cells, w, sk, nk)) : null });

  const blackout = partyBlackout(now);

  // Representación por comunidad: cuánto pesa cada una en la muestra frente al censo
  const regDist = distribution(cells, w, "region");
  const regions = SE.REGIONS.map(([id, name]) => {
    const s = regDist[id] || { n: 0, raw: 0, weighted: 0 };
    const target = margins.region[id] ?? null;
    return { id, name, n: s.n, sample: r4(s.raw), target: r4(target), weighted: R.applied ? r4(s.weighted) : null, ratio: target ? r4(s.raw / target) : null };
  });

  const dims = Object.keys(margins).map((dim) => {
    const dist = distribution(cells, w, dim);
    const cats = Object.keys(margins[dim]).concat(Object.keys(dist).filter((k) => !(k in margins[dim])));
    const used = R.applied && R.targets && R.targets[dim];
    return {
      dim, used: !!used,
      skipped: (R.skipped || []).find((s) => s.dim === dim) || null,
      rows: cats.map((k) => ({ cat: k, n: dist[k] ? dist[k].n : 0, sample: r4(dist[k] ? dist[k].raw : 0), target: k in margins[dim] ? r4(margins[dim][k]) : null, weighted: R.applied && dist[k] ? r4(dist[k].weighted) : null })),
    };
  });

  const out = {
    generatedAt: now.toISOString(),
    dataVersion: SE.DATA_VERSION,
    participation: {
      received: totals[0].received, valid: totals[0].valid, last24h: totals[0].last24h,
      flagged: Object.fromEntries(flagRows.map((r) => [r.f, r.n])),
      byHour: byHour.map((r) => ({ hour: new Date(r.hour).toISOString(), n: r.n })),
      byDay,
    },
    weighting: {
      applied: !!R.applied, minimum: CONFIG.MIN_FOR_WEIGHTED, approximateMargins: APPROXIMATE,
      neff: r4(neff), deff: R.applied ? r4(R.deff) : 1, wmin: R.applied ? r4(R.wmin) : 1, wmax: R.applied ? r4(R.wmax) : 1,
      trimmedShare: R.applied ? r4(R.trimmedShare) : 0, iterations: R.iterations || 0, converged: R.applied ? R.converged : null,
      maxDeviation: R.applied ? r4(R.maxDeviation) : null, dims,
    },
    regions,
    blackout,
    parties: null,
    prediction: null,
    themes: SE.THEMES.map((t, i) => ({ id: t.id, name: t.name, ...both(`pts_${i}`) })),
    questions: SE.QUESTIONS.map((q, i) => {
      const answered = sumKey(cells, `qn_${i}`);
      const mean = both(`qs_${i}`, `qn_${i}`), sq = both(`qq_${i}`, `qn_${i}`);
      const sd = (m, s) => (m === null || s === null ? null : r4(Math.sqrt(Math.max(0, s - m * m))));
      return {
        id: q.id, short: q.short, theme: q.t, f: q.f, answered, skip: r4(ratio(n - answered, n)),
        mean, sd: { raw: sd(mean.raw, sq.raw), weighted: sd(mean.weighted, sq.weighted) },
        agree: both(`qp_${i}`, `qn_${i}`), disagree: both(`qm_${i}`, `qn_${i}`), decisive: both(`qd_${i}`),
      };
    }),
    blind: SE.BLIND.map((b, i) => ({ id: b.id, answered: sumKey(cells, `bn_${i}`), support: both(`bs_${i}`, `bn_${i}`), oppose: both(`bo_${i}`, `bn_${i}`) })),
    seals,
  };

  if (!blackout.active) {
    out.parties = SE.PARTIES.map((p, i) => {
      const first = both(`top_${i}`);
      const wp = R.applied ? first.weighted : first.raw;
      return { id: p.id, name: p.name, sig: p.sig, regional: !!p.where, first, moe: r4(moe(wp, neff)), affinity: { raw: r4(ratio(sumKey(cells, `aff_${i}`), n * 100)), weighted: R.applied ? r4(wmean(cells, w, `aff_${i}`) / 100) : null } };
    });
    out.prediction = { n: sumKey(cells, "pr_n"), hit: both("pr_hit", "pr_n") };
  }
  return out;
}

module.exports = { buildStats, AGG_SQL };
