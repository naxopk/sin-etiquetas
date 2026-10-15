"use strict";
/* Distribuciones de referencia de la población con derecho a voto, usadas para ponderar.
   Son recuentos oficiales; cada dimensión se normaliza para que sume 1. */

const MARGINS = {
  /* Censo electoral de españoles residentes en España (CER), generales del 23-J de 2023, por comunidad.
     Fuente: Ministerio del Interior, Área de descargas de infoelectoral, fichero de mesas
     https://infoelectoral.interior.gob.es/estaticos/docxl/apliextr/02202307_MESA.zip (09022307.DAT).
     Suma del campo «Censo del I.N.E.» de todas las mesas, sin los registros del CERA (municipio 999).
     Total CER: 35.140.881. CER + CERA (2.328.260) = 37.469.141, el «Censo del I.N.E.» de cada comunidad
     y del total nacional en el fichero de totales 02202307_TOTA.zip (07022307.DAT). */
  region: {
    AND: 6400216, CAT: 5422186, MAD: 4848029, VAL: 3609789, GAL: 2216483, CYL: 1922163, PVA: 1708697,
    CAN: 1617233, CLM: 1554912, MUR: 1061940, ARA: 980000, EXT: 861313, AST: 835586, BAL: 795902,
    NAV: 489973, CNT: 466590, RIO: 234384, CEU: 60335, MEL: 55150,
  },
  /* Población residente de nacionalidad española de 18 años o más a 1 de enero de 2025 (35.357.083 personas).
     Fuente: INE, Censo Anual de Población 2025, tabla 67217 «Población por sexo, edad (año a año) y nacionalidad
     (española/extranjera)», Total Nacional: https://www.ine.es/jaxiT3/Tabla.htm?t=67217
     (API: https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/67217). Edades simples sumadas en cada tramo.
     Es la cifra oficial más reciente con edad año a año y nacionalidad; la Estadística Continua de Población
     (1-7-2026) solo da grupos quinquenales y no permite separar 18-19 de 15-17. */
  age: { "18-29": 5167452, "30-44": 7275511, "45-64": 13283518, "65+": 9630602 },
  sex: { F: 18283734, M: 17073349 },
  /* Generales del 23-J de 2023, Congreso, escrutinio con CERA (datos oficiales), total nacional.
     Fuente: Ministerio del Interior, https://infoelectoral.interior.gob.es/estaticos/docxl/apliextr/02202307_TOTA.zip
     (07022307.DAT: censo y votos en blanco y nulos; 08022307.DAT: votos por candidatura agrupados en el código
     nacional, así que PSOE incluye PSC, PSdeG, PSE, PSN y PSIB, y SUMAR incluye sus listas regionales).
     Censo de escrutinio con CERA: 37.469.458. Votantes: 24.952.447 (candidaturas 24.487.414 + blancos 200.673
     + nulos 264.360).
     OTROS = resto de candidaturas (24.487.414 − 22.084.551 = 2.402.863) + blancos + nulos = 2.867.896.
     NOVOTO = abstención = 37.469.458 − 24.952.447 = 12.517.011. */
  vote23: { PP: 8160837, PSOE: 7821718, VOX: 3057000, SUMAR: 3044996, OTROS: 2867896, NOVOTO: 12517011 },
};

const APPROXIMATE = false;

function normalized() {
  const out = {};
  for (const [dim, cats] of Object.entries(MARGINS)) {
    const tot = Object.values(cats).reduce((a, b) => a + b, 0);
    out[dim] = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, v / tot]));
  }
  return out;
}

module.exports = { MARGINS, APPROXIMATE, normalized };
