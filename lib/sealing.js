"use strict";
/* Sellado diario del registro */
const { GENESIS, merkleRoot, chainOf } = require("./ledger");

const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

/* Sella, en orden, todos los días cerrados (anteriores a hoy en UTC) que aún no tienen sello */
async function sealPending(d, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const last = await d.query("select day::text as day, chain from seals order by day desc limit 1");
  let prev = last.length ? last[0].chain : GENESIS;
  const lastDay = last.length ? iso(last[0].day) : null;
  const days = await d.query(
    "select distinct day::text as day from responses where day < $1::date" + (lastDay ? " and day > $2::date" : "") + " order by day",
    lastDay ? [today, lastDay] : [today]
  );
  const sealed = [];
  for (const r of days) {
    const day = iso(r.day);
    const leaves = (await d.query("select leaf from responses where day = $1::date order by id", [day])).map((x) => x.leaf);
    const root = merkleRoot(leaves);
    const chain = chainOf(prev, day, leaves.length, root);
    await d.query("insert into seals (day, n, merkle_root, prev, chain) values ($1, $2, $3, $4, $5)", [day, leaves.length, root, prev, chain]);
    sealed.push({ day, n: leaves.length, merkle_root: root, prev, chain });
    prev = chain;
  }
  await d.query("delete from rate_hits where ts < now() - interval '48 hours'");
  return sealed;
}

module.exports = { sealPending, iso };
