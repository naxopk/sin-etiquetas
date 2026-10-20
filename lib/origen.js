"use strict";
/* De dónde llega la gente: totales por día, origen y campaña en la tabla source_counts.
   Nunca se une a una respuesta: el envío suma uno a su origen y nada más. */

// Orígenes admitidos (y cómo se escriben a veces en un enlace). Lo demás cuenta como «otro».
const SOURCES = {
  instagram: ["ig"], tiktok: ["tt"], facebook: ["fb"], x: ["twitter"], youtube: ["yt"], threads: [],
  whatsapp: ["wa"], telegram: [], linkedin: [], reddit: [], bluesky: [], email: ["mail", "newsletter"],
  buscador: ["google", "bing", "duckduckgo", "ecosia"], otro: [],
};
const ALIAS = {};
for (const [k, list] of Object.entries(SOURCES)) { ALIAS[k] = k; list.forEach((a) => { ALIAS[a] = k; }); }

const MAX_CAMPAIGNS_PER_DAY = 30; // más campañas distintas en un día se juntan en «otra»

function normalizeSource(v) {
  if (typeof v !== "string" || !v.trim()) return "directo";
  return ALIAS[v.trim().toLowerCase()] || "otro";
}

function normalizeCampaign(v) {
  if (typeof v !== "string") return "";
  return v.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/* Suma uno a «visits» o «submissions» del origen en el día de hoy (UTC) */
async function countSource(d, field, source, campaign, now = new Date()) {
  if (field !== "visits" && field !== "submissions") throw new Error("Campo no válido");
  const day = now.toISOString().slice(0, 10);
  const s = normalizeSource(source);
  let c = normalizeCampaign(campaign);
  const hit = await d.query(
    `update source_counts set ${field} = ${field} + 1 where day = $1 and source = $2 and campaign = $3 returning 1`, [day, s, c]);
  if (hit.length) return;
  if (c) {
    const [n] = await d.query("select count(*)::int as n from source_counts where day = $1 and campaign <> ''", [day]);
    if (n.n >= MAX_CAMPAIGNS_PER_DAY) c = "otra";
  }
  await d.query(
    `insert into source_counts (day, source, campaign, ${field}) values ($1, $2, $3, 1)
     on conflict (day, source, campaign) do update set ${field} = source_counts.${field} + 1`, [day, s, c]);
}

/* Totales por origen y campaña desde un día, y el detalle por día */
async function sourceReport(d, since) {
  const days = await d.query(
    "select to_char(day, 'YYYY-MM-DD') as day, source, campaign, visits, submissions from source_counts where day >= $1 order by day, source, campaign", [since]);
  const totals = await d.query(
    `select source, campaign, sum(visits)::int as visits, sum(submissions)::int as submissions
     from source_counts where day >= $1 group by source, campaign order by submissions desc, visits desc`, [since]);
  return { since, totals, days };
}

module.exports = { normalizeSource, normalizeCampaign, countSource, sourceReport, MAX_CAMPAIGNS_PER_DAY };
