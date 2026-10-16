/* Sin Etiquetas · datos y cálculo compartidos.
   Este mismo archivo lo usan el navegador (window.SE) y el servidor (require).
   Si cambias una posición, cambia DATA_VERSION: cada respuesta guarda la versión con la que se calculó. */
(function(root){
"use strict";
const DATA_VERSION = "2026-10-15";
const BUDGET = 20, MAXPTS = 5;
/* ============================================================
   DATOS
   Orden de posiciones en cada pregunta (array p):
   PP, PSOE, VOX, SUMAR, PODEMOS, SALF, ERC, JUNTS, BILDU, PNV, BNG, CC
   Escala: -2 muy en contra … +2 muy a favor (en dilemas: -2 = claramente A, +2 = claramente B)
   null = sin posición pública clara
   ============================================================ */
const REGIONS = [
  ["AND","Andalucía"],["ARA","Aragón"],["AST","Asturias"],["BAL","Illes Balears"],["CAN","Canarias"],
  ["CNT","Cantabria"],["CLM","Castilla-La Mancha"],["CYL","Castilla y León"],["CAT","Cataluña"],
  ["VAL","Comunitat Valenciana"],["EXT","Extremadura"],["GAL","Galicia"],["MAD","Comunidad de Madrid"],
  ["MUR","Región de Murcia"],["NAV","Navarra"],["PVA","País Vasco"],["RIO","La Rioja"],["CEU","Ceuta"],
  ["MEL","Melilla"],["ND","Prefiero no decirlo"]
];

const PARTIES = [
  {id:"PP", sig:"PP", name:"Partido Popular", ideo:"Centroderecha liberal-conservadora. Partido Popular Europeo.",
   lead:"Alberto Núñez Feijóo (presidente y candidato)", res:"137 escaños · 33,1 %", where:null, web:"https://www.pp.es",
   about:"Fue el partido más votado en 2023, pero no sumó apoyos para gobernar. Gobierna la mayoría de comunidades autónomas, en varias de ellas tras pactos con Vox.",
   keys:["Bajada de impuestos: deflactar el IRPF y suprimir el impuesto temporal a las grandes fortunas","Rechazo a la Ley de Amnistía y a la financiación singular de Cataluña","Vivienda: más suelo y oferta, y desalojo rápido de viviendas ocupadas","Prolongar la vida de las centrales nucleares","Reformar la elección del CGPJ para que los jueces elijan a la mayoría","Colaboración público-privada en sanidad y libertad de elección educativa"]},
  {id:"PSOE", sig:"PSOE", name:"Partido Socialista Obrero Español", ideo:"Centroizquierda socialdemócrata. Socialistas Europeos.",
   lead:"Pedro Sánchez (secretario general y presidente del Gobierno)", res:"121 escaños · 31,7 %", where:null, web:"https://www.psoe.es",
   about:"Gobierna desde 2018. Tras 2023 formó coalición con Sumar, apoyada por partidos nacionalistas. Convocó elecciones anticipadas tras perder en octubre de 2026 la votación de dos decretos de vivienda.",
   keys:["Ley de Vivienda de 2023, con topes al alquiler en zonas tensionadas","Subidas del salario mínimo y pensiones ligadas al IPC","Ley de Amnistía (2024) y acuerdos de financiación con ERC","Regularización extraordinaria de inmigrantes (real decreto, abril de 2026)","Propuesta de incluir el aborto en la Constitución","Embargo de armas a Israel y reconocimiento del Estado palestino"]},
  {id:"VOX", sig:"VOX", name:"Vox", ideo:"Derecha nacional-conservadora. Patriotas por Europa.",
   lead:"Santiago Abascal (presidente y candidato)", res:"33 escaños · 12,4 %", where:null, web:"https://www.voxespana.es",
   about:"Tercera fuerza en 2023. Las encuestas de octubre de 2026 lo sitúan claramente por encima de su resultado anterior.",
   keys:["Control estricto de la inmigración, expulsiones y «prioridad nacional» en ayudas","Recentralizar educación, sanidad, justicia e interior","Supresión de los impuestos de sucesiones y patrimonio","Sustituir la ley de violencia de género por una de violencia intrafamiliar","Rechazo al Pacto Verde europeo y a la Agenda 2030","Defensa de la tauromaquia, la caza y el mundo rural"]},
  {id:"SUMAR", sig:"SUMAR", name:"Sumar (candidatura unitaria)", ideo:"Izquierda. Coalición de Movimiento Sumar, Izquierda Unida, Más Madrid, Comuns y otros.",
   lead:"Candidatura pendiente de anuncio (previsto el 17 de octubre de 2026)", res:"31 escaños · 12,3 % (incluía a Podemos)", where:null, web:null,
   about:"Socio menor del Gobierno de coalición. Para el 29N prepara una candidatura conjunta con IU, Más Madrid y Comuns. Yolanda Díaz no repetirá como candidata.",
   keys:["Reducción de la jornada a 37,5 horas sin bajar sueldo","«Herencia universal»: 20.000 € para cada joven al cumplir 18 años (programa 2023)","Topes al alquiler, vivienda pública y empresa pública de energía","Impuesto permanente a las grandes fortunas","Sanidad pública sin derivaciones a la privada","Embargo total a Israel y rechazo al aumento del gasto militar"]},
  {id:"PODEMOS", sig:"PODEMOS", name:"Podemos", ideo:"Izquierda. Se separó de Sumar en diciembre de 2023.",
   lead:"Ione Belarra (secretaria general) · Irene Montero (candidata)", res:"Entró en 2023 dentro de Sumar; hoy 4 diputados en el Grupo Mixto", where:null, web:"https://podemos.info",
   about:"Concurre por separado del resto de la izquierda. Pactó con el PSOE la regularización extraordinaria de inmigrantes de 2026.",
   keys:["Intervención fuerte del mercado de la vivienda para bajar alquileres","Regularización de inmigrantes y vías legales de llegada","Referéndum sobre monarquía o república","España plurinacional con derecho a decidir","Rechazo a la OTAN y al gasto militar; ruptura de relaciones con Israel","Agenda feminista y LGTBI"]},
  {id:"SALF", sig:"SALF", name:"Se Acabó La Fiesta", ideo:"Populismo antiestablishment de derecha.",
   lead:"Luis «Alvise» Pérez (fundador)", res:"Sin escaños en 2023 · 3 eurodiputados en 2024 (4,6 %)", where:null, web:null,
   about:"Agrupación surgida de las redes sociales. Centra su discurso en la corrupción, la seguridad y la inmigración. Ha publicado poco programa detallado en otros temas, por eso varias posiciones aparecen sin datos.",
   keys:["Mano dura contra la delincuencia, incluida una gran prisión de máxima seguridad","Control estricto de la inmigración","Bajada de impuestos y recorte de «gasto político»","Lucha contra la corrupción y los privilegios de los cargos públicos"]},
  {id:"ERC", sig:"ERC", name:"Esquerra Republicana de Catalunya", ideo:"Izquierda independentista catalana.",
   lead:"Oriol Junqueras (presidente) · Gabriel Rufián (portavoz en el Congreso)", res:"7 escaños · 1,9 %", where:["CAT"], web:"https://www.esquerra.cat",
   about:"Apoyó la investidura de Sánchez. En 2024 pactó con el PSC la «financiación singular» para Cataluña.",
   keys:["Referéndum de autodeterminación pactado","Financiación singular: que la Generalitat recaude los impuestos","Amnistía y desjudicialización del procés","Topes al alquiler y servicios públicos fuertes","Defensa del catalán y de la inmersión lingüística"]},
  {id:"JUNTS", sig:"JUNTS", name:"Junts per Catalunya", ideo:"Independentismo catalán de centroderecha.",
   lead:"Carles Puigdemont (presidente) · Míriam Nogueras (portavoz en el Congreso)", res:"7 escaños · 1,6 %", where:["CAT"], web:"https://junts.cat",
   about:"Fue decisivo para la investidura de 2023 a cambio de la amnistía y rompió con el PSOE a finales de 2025.",
   keys:["Autodeterminación y concierto económico para Cataluña","Competencias propias en inmigración","Posiciones liberales en economía: votó contra la jornada de 37,5 horas","Endurecer las penas por multirreincidencia","Prolongar las centrales nucleares catalanas"]},
  {id:"BILDU", sig:"EH BILDU", name:"Euskal Herria Bildu", ideo:"Izquierda independentista vasca.",
   lead:"Arnaldo Otegi (coordinador general) · Mertxe Aizpurua (portavoz)", res:"6 escaños · 1,4 %", where:["PVA","NAV"], web:"https://ehbildu.eus",
   about:"Apoya al Gobierno en votaciones clave. Se presenta en el País Vasco y Navarra.",
   keys:["Derecho a decidir de Euskal Herria","Marco vasco de relaciones laborales y salario mínimo propio","Vivienda pública y topes al alquiler","Reforma de la Ley de Seguridad Ciudadana","Servicios públicos sin gestión privada"]},
  {id:"PNV", sig:"EAJ-PNV", name:"Partido Nacionalista Vasco", ideo:"Nacionalismo vasco de centro, de origen democristiano.",
   lead:"Aitor Esteban (presidente del EBB)", res:"5 escaños · 1,1 %", where:["PVA"], web:"https://www.eaj-pnv.eus",
   about:"Partido de gobierno en el País Vasco. En Navarra concurre dentro de Geroa Bai, que no se incluye en este test.",
   keys:["Concierto Económico y ampliación del autogobierno","Nuevo estatus para Euskadi con reconocimiento nacional","Perfil económico moderado, cercano a la industria","Europeísmo","Previsión social complementaria (EPSV)"]},
  {id:"BNG", sig:"BNG", name:"Bloque Nacionalista Galego", ideo:"Izquierda nacionalista gallega.",
   lead:"Ana Pontón (portavoz nacional) · Néstor Rego (diputado)", res:"1 escaño · 0,6 %", where:["GAL"], web:"https://www.bng.gal",
   about:"Segunda fuerza en el Parlamento de Galicia. Solo se presenta en Galicia.",
   keys:["Soberanía y autodeterminación de Galicia","Transferencia de la AP-9 y más competencias","Defensa del sector primario (pesca, leche, campo)","Servicios públicos y vivienda pública","Rechazo a la OTAN"]},
  {id:"CC", sig:"CC", name:"Coalición Canaria", ideo:"Nacionalismo canario de centro.",
   lead:"Fernando Clavijo (secretario general y presidente de Canarias) · Cristina Valido (diputada)", res:"1 escaño · 0,5 %", where:["CAN"], web:"https://coalicioncanaria.org",
   about:"Gobierna Canarias en coalición con el PP. Ha apoyado puntualmente a gobiernos de distinto signo a cambio de compromisos para las islas.",
   keys:["Agenda canaria: Régimen Económico y Fiscal, financiación y transporte","Reparto obligatorio de menores migrantes entre comunidades","Perfil económico de centro","Apoyos puntuales a cambio de inversiones"]}
];
const PIDX = {}; PARTIES.forEach((p,i)=>PIDX[p.id]=i);

const THEMES = [
  {id:"eco",  name:"Economía e impuestos", short:"Economía", d:"Impuestos, gasto público y papel del Estado"},
  {id:"trab", name:"Trabajo y salarios", short:"Trabajo", d:"Jornada, despido, salario mínimo"},
  {id:"viv",  name:"Vivienda", short:"Vivienda", d:"Alquiler, construcción, ocupación"},
  {id:"bien", name:"Pensiones, sanidad y educación", short:"Bienestar", d:"Servicios públicos y cómo se gestionan"},
  {id:"terr", name:"Modelo territorial", short:"Territorio", d:"Autonomías, financiación, autodeterminación"},
  {id:"inm",  name:"Inmigración", short:"Inmigración", d:"Regularización, fronteras, acceso a ayudas"},
  {id:"amb",  name:"Energía y medio ambiente", short:"Ambiente", d:"Clima, nucleares, campo"},
  {id:"soc",  name:"Derechos y valores", short:"Valores", d:"Aborto, eutanasia, igualdad, laicidad"},
  {id:"inst", name:"Justicia, seguridad e instituciones", short:"Instituc.", d:"Penas, protesta, jueces, Jefatura del Estado"},
  {id:"ext",  name:"Europa y política exterior", lc:"Europa y política exterior", short:"Exterior", d:"Unión Europea, defensa, Oriente Próximo"}
];
const TMAP = {}; THEMES.forEach(t=>TMAP[t.id]=t);

/* f: "l" afirmación (de acuerdo / en desacuerdo) · "d" dilema entre A y B
   ax: eje del mapa (econ: + = más mercado · social: + = más conservador · terr: + = más centralización)
   sg: signo con el que la respuesta suma al eje */
const QUESTIONS = [
 {id:"q1", t:"eco", f:"l", ax:"econ", sg:-1, short:"Impuesto anual a patrimonios de más de 3 millones",
  text:"Las personas con un patrimonio superior a 3 millones de euros deberían pagar cada año un impuesto específico sobre esa riqueza, aunque algunas decidan trasladar su residencia fuera de España.",
  p:[-2,1,-2,2,2,-2,1,-1,2,0,2,-1],
  pro:"Grava grandes fortunas que apenas tributan por sus rentas y reduce la desigualdad.",
  con:"Pocos países europeos lo mantienen; puede expulsar capital, empresas y residentes.",
  n:{PP:"Promete suprimir el impuesto temporal de solidaridad de las grandes fortunas.",PSOE:"Creó en 2022 el impuesto de solidaridad de las grandes fortunas.",VOX:"Propone suprimir los impuestos de patrimonio y sucesiones.",SUMAR:"Quiere un impuesto permanente a las grandes fortunas."}},
 {id:"q2", t:"eco", f:"d", ax:"econ", sg:-1, short:"10.000 millones extra: ¿bajar IRPF o reforzar servicios?",
  text:"Si el Estado tuviera 10.000 millones de euros más al año, ¿a qué los dedicarías?",
  a:"Bajar el IRPF a las rentas medias y bajas.", b:"Reforzar sanidad, educación y atención a la dependencia.",
  aS:"bajar el IRPF", bS:"reforzar servicios",
  p:[-2,1,-2,2,2,-2,1,-1,2,0,2,-1],
  pro:"Deja más dinero a las familias, compensa la subida de precios y estimula el consumo.",
  con:"Los servicios públicos acumulan listas de espera y falta de personal; un euro gastado ahí llega a quien más lo necesita.",
  n:{PP:"Su propuesta central es deflactar el IRPF y bajar impuestos a rentas medias.",SUMAR:"Prioriza ampliar el Estado del bienestar."}},
 {id:"q3", t:"eco", f:"l", ax:"econ", sg:-1, short:"Empresas públicas que compitan en energía o vivienda",
  text:"El Estado debería crear o ampliar empresas públicas en sectores como la energía o la vivienda, que compitan con las empresas privadas.",
  p:[-2,1,-1,2,2,-2,1,-1,2,-1,2,-1],
  pro:"Puede abaratar precios y asegurar el suministro en sectores estratégicos.",
  con:"Las empresas públicas tienden a ser menos eficientes, acumulan deuda y pueden usarse políticamente.",
  n:{PSOE:"El Gobierno convirtió la sociedad estatal SEPES en una empresa pública de vivienda.",SUMAR:"Propone una empresa pública de energía."}},
 {id:"q4", t:"trab", f:"l", ax:"econ", sg:-1, short:"Jornada máxima de 37,5 horas sin bajar el sueldo",
  text:"La jornada laboral máxima debería bajar a 37,5 horas semanales sin reducir el salario, aunque suponga más costes para las pequeñas empresas.",
  p:[-2,2,-2,2,2,-2,2,-2,2,1,2,null],
  pro:"Mejora la conciliación y reparte con los trabajadores las ganancias de productividad.",
  con:"Encarece el empleo en pymes, hostelería o comercio, donde los márgenes son estrechos.",
  n:{SUMAR:"Impulsó la ley desde el Ministerio de Trabajo.",JUNTS:"Votó con PP y Vox para tumbar la ley en septiembre de 2025.",PP:"Votó en contra; prefiere dejarlo a la negociación colectiva."}},
 {id:"q5", t:"trab", f:"l", ax:"econ", sg:-1, short:"Despido improcedente más caro",
  text:"Las indemnizaciones por despido improcedente deberían subir y ajustarse al daño real de cada trabajador, aunque eso haga más caro contratar.",
  p:[-1,0,-1,2,2,-2,1,-2,2,-1,2,-1],
  pro:"Protege más al trabajador y desincentiva despidos injustificados.",
  con:"Si despedir cuesta más, las empresas se lo piensan más antes de contratar indefinidos.",
  n:{SUMAR:"Defiende reformar el despido tras el dictamen del Comité Europeo de Derechos Sociales."}},
 {id:"q6", t:"trab", f:"d", ax:"econ", sg:-1, short:"Salario mínimo: ¿pactado o por ley hasta el 60 %?",
  text:"Sobre el salario mínimo, ¿qué te parece más razonable?",
  a:"Que se fije sobre todo por acuerdo entre empresas y sindicatos, sin metas por ley.", b:"Que siga subiendo por decisión del Gobierno hasta el 60 % del salario medio.",
  aS:"pacto entre agentes sociales", bS:"subida por ley",
  p:[-1,2,-1,2,2,null,2,-1,2,0,2,-1],
  pro:"Las empresas y los sindicatos conocen mejor qué puede soportar cada sector.",
  con:"Garantiza un suelo digno a los trabajadores con menos poder de negociación.",
  n:{PSOE:"El salario mínimo ha subido más de un 60 % desde 2018.",BILDU:"Pide además un salario mínimo propio para Euskadi y Navarra."}},
 {id:"q7", t:"viv", f:"l", ax:"econ", sg:-1, short:"Topes al alquiler en zonas tensionadas",
  text:"Limitar por ley el precio del alquiler en las zonas más tensionadas es una forma eficaz de proteger a los inquilinos.",
  p:[-2,1,-2,2,2,-2,2,-1,2,0,2,-1],
  pro:"Frena subidas bruscas y evita que los vecinos tengan que irse de su barrio.",
  con:"Puede reducir la oferta y desviar pisos al alquiler de temporada o turístico.",
  n:{PSOE:"La Ley de Vivienda de 2023 permite topar alquileres en zonas tensionadas.",ERC:"Cataluña fue la primera comunidad en aplicar los topes.",PP:"Votó contra la ley y no aplica los topes donde gobierna."}},
 {id:"q8", t:"viv", f:"d", ax:"econ", sg:-1, short:"Vivienda: ¿liberar suelo o vivienda pública?",
  text:"Para que baje el precio de la vivienda, ¿cuál debería ser la prioridad?",
  a:"Liberar suelo y recortar trámites para que se construya mucho más.", b:"Construir vivienda pública en alquiler y regular más el mercado.",
  aS:"liberar suelo", bS:"vivienda pública y regulación",
  p:[-2,1,-2,2,2,-2,1,-1,2,0,2,-1],
  pro:"Si hay más oferta, los precios bajan; hoy se construye la mitad que hace veinte años.",
  con:"El mercado no construye para rentas bajas; solo un parque público grande estabiliza precios, como en Viena.",
  n:{PP:"Propone una ley de suelo para acelerar la construcción.",SUMAR:"Pide un gran parque público de alquiler."}},
 {id:"q9", t:"viv", f:"l", ax:"social", sg:1, short:"Desalojo policial en 48 horas sin orden judicial",
  text:"La policía debería poder desalojar en 48 horas una vivienda ocupada sin título legal, sin esperar a una orden judicial.",
  p:[2,-1,2,-2,-2,2,-1,2,-2,0,-2,1],
  pro:"Protege rápido a los propietarios, sobre todo a particulares con una sola vivienda.",
  con:"Saltarse al juez puede afectar a inquilinos con conflictos legítimos o a familias vulnerables.",
  n:{PP:"Ha registrado varias leyes para desalojar en 24-48 horas.",JUNTS:"Ha impulsado propuestas para acelerar los desalojos.",PSOE:"Optó por incluir la ocupación en los juicios rápidos, con juez."}},
 {id:"q10", t:"bien", f:"l", ax:"econ", sg:1, short:"Parte de las cotizaciones a una cuenta propia",
  text:"Una parte de lo que cotiza cada trabajador debería ir a una cuenta de ahorro a su nombre para la jubilación, en lugar de ir todo al sistema común.",
  p:[0,-1,2,-2,-2,null,-1,null,-2,1,-2,null],
  pro:"Da a cada trabajador un ahorro propio y alivia un sistema presionado por el envejecimiento.",
  con:"Resta ingresos al sistema que paga las pensiones actuales y traslada el riesgo de los mercados al individuo.",
  n:{VOX:"Propone un sistema mixto de reparto y capitalización.",PNV:"Defiende el modelo vasco de previsión complementaria (EPSV)."}},
 {id:"q11", t:"bien", f:"l", ax:"econ", sg:1, short:"Derivar operaciones a la privada para bajar listas de espera",
  text:"Que la sanidad pública pague a clínicas privadas para operar a sus pacientes y reducir las listas de espera es una buena solución.",
  p:[2,-1,1,-2,-2,null,-1,1,-2,0,-2,1],
  pro:"Aprovecha capacidad disponible y reduce esperas ya, no dentro de años.",
  con:"Desvía dinero de la pública y la hace depender de la privada a largo plazo.",
  n:{PP:"Las comunidades que gobierna recurren con frecuencia a los conciertos.",SUMAR:"El Ministerio de Sanidad, en manos de Sumar, impulsó un proyecto de ley, aún en trámite, para limitar la gestión privada."}},
 {id:"q12", t:"bien", f:"l", ax:"econ", sg:-1, short:"Dinero público solo para colegios públicos",
  text:"El dinero público para colegios debería ir solo a centros públicos, retirando poco a poco los conciertos con los colegios privados.",
  p:[-2,-1,-2,1,2,null,0,-2,1,-2,2,-1],
  pro:"Concentra recursos en la escuela pública y reduce la segregación por renta.",
  con:"Limita la libertad de elección y obligaría a absorber a millones de alumnos de la concertada.",
  n:{PSOE:"Mantiene la concertada, aunque limitó su expansión con la ley educativa de 2020."}},
 {id:"q13", t:"bien", f:"l", ax:"terr", sg:1, short:"Elegir estudiar principalmente en castellano",
  text:"En las comunidades con lengua cooficial, las familias deberían poder elegir que sus hijos estudien principalmente en castellano.",
  p:[2,-1,2,-2,-1,1,-2,-2,-2,-2,-2,null],
  pro:"Respeta la libertad de las familias y garantiza el dominio de la lengua común.",
  con:"Separar a los alumnos por lengua divide a la sociedad y pone en riesgo lenguas minoritarias.",
  n:{PP:"Defiende el castellano como lengua vehicular y la libertad de elección.",ERC:"Defiende la inmersión lingüística en catalán.",BNG:"Pide más presencia del gallego en la escuela."}},
 {id:"q14", t:"terr", f:"l", ax:"terr", sg:-1, short:"Referéndum pactado de autodeterminación",
  text:"Si una mayoría clara de una comunidad lo pide durante años, debería poder votar en un referéndum pactado con el Estado si quiere seguir en España.",
  p:[-2,-2,-2,1,2,-2,2,2,2,1,2,-1],
  pro:"Es una forma democrática de resolver un conflicto que se prolonga, como hizo Reino Unido con Escocia.",
  con:"La Constitución atribuye la soberanía al conjunto de los españoles; abriría la puerta a fracturas permanentes.",
  n:{PSOE:"Rechaza un referéndum de autodeterminación; apuesta por el diálogo y la reforma de estatutos.",PODEMOS:"Defiende el derecho a decidir en una España plurinacional.",PNV:"Propone un nuevo estatus para Euskadi con capacidad de decisión pactada."}},
 {id:"q15", t:"terr", f:"d", ax:"terr", sg:-1, short:"¿Más Estado central o más autogobierno?",
  text:"¿Hacia dónde debería moverse el reparto de poder entre el Estado y las comunidades autónomas?",
  a:"Devolver al Estado competencias como educación o sanidad.", b:"Dar más autogobierno a las comunidades que lo pidan.",
  aS:"recentralizar", bS:"más autogobierno",
  p:[0,1,-2,2,2,-1,2,2,2,2,2,2],
  pro:"Garantiza la igualdad de todos los españoles y evita duplicidades.",
  con:"Las comunidades conocen mejor sus necesidades y el autogobierno es parte de su identidad.",
  n:{VOX:"Propone que el Estado recupere educación, sanidad, justicia e interior.",PP:"Defiende el Estado autonómico actual, sin grandes cambios."}},
 {id:"q16", t:"terr", f:"l", ax:"terr", sg:-1, short:"Que cada comunidad recaude todos sus impuestos",
  text:"Cada comunidad debería poder recaudar y gestionar todos sus impuestos y pagar al Estado una cuota, como ya hacen el País Vasco y Navarra.",
  p:[-2,0,-2,1,0,-2,2,2,2,2,2,1],
  pro:"Da más responsabilidad fiscal a cada territorio y acerca la gestión al ciudadano.",
  con:"Rompe la caja común y reduce la solidaridad con las comunidades con menos ingresos.",
  n:{PSOE:"El PSC pactó con ERC en 2024 una «financiación singular» para Cataluña, criticada por varios presidentes autonómicos socialistas.",PP:"Rechaza la financiación singular y pide un nuevo modelo común."}},
 {id:"q17", t:"terr", f:"l", ax:"terr", sg:-1, short:"Indultos y amnistías para cerrar conflictos",
  text:"Para cerrar conflictos políticos, un Gobierno debería poder aprobar medidas de gracia como indultos o amnistías, aunque supongan perdonar delitos.",
  p:[-2,1,-2,2,2,-2,2,2,2,1,1,-1],
  pro:"Puede rebajar tensiones y devolver el conflicto a la política.",
  con:"Rompe la igualdad ante la ley y puede incentivar que se repitan los delitos.",
  n:{PSOE:"Aprobó en 2024 la Ley de Amnistía para los implicados en el procés.",PP:"Votó en contra y la recurrió ante el Tribunal Constitucional."}},
 {id:"q18", t:"inm", f:"l", ax:"social", sg:-1, short:"Regularización de 500.000 inmigrantes (2026)",
  text:"La regularización extraordinaria de alrededor de medio millón de inmigrantes que ya vivían en España, aprobada en abril de 2026, fue una buena medida.",
  p:[-1,2,-2,2,2,-2,1,null,2,1,2,null],
  pro:"Saca de la economía sumergida a personas que ya trabajan aquí, que pasan a cotizar y tener derechos.",
  con:"Puede animar más llegadas irregulares y se aprobó por decreto, sin votación en el Congreso.",
  n:{PSOE:"La aprobó por real decreto tras un acuerdo con Podemos.",PODEMOS:"La pactó con el Gobierno, a partir de una iniciativa popular con cientos de miles de firmas.",VOX:"La considera un «efecto llamada» y promete revertirla."}},
 {id:"q19", t:"inm", f:"d", ax:"social", sg:1, short:"Inmigración: ¿integración y vías legales o control y expulsiones?",
  text:"En inmigración, ¿qué debería tener más peso?",
  a:"Integrar a quien ya está aquí y abrir más vías legales para venir a trabajar.", b:"Controlar más las fronteras y acelerar la expulsión de quien entra de forma irregular.",
  aS:"integración y vías legales", bS:"control y expulsiones",
  p:[1,-1,2,-2,-2,2,-1,1,-2,-1,-2,1],
  pro:"España necesita trabajadores y la integración reduce conflictos a largo plazo.",
  con:"Sin control efectivo de fronteras, el sistema pierde credibilidad y apoyo social.",
  n:{CC:"Exige que el resto de comunidades acojan a los menores que llegan a Canarias.",PP:"Pide más control de fronteras y contratación en origen."}},
 {id:"q20", t:"inm", f:"l", ax:"social", sg:1, short:"Prioridad de los españoles en vivienda pública y ayudas",
  text:"Los españoles deberían tener prioridad sobre los extranjeros residentes a la hora de acceder a vivienda pública y ayudas sociales.",
  p:[-1,-2,2,-2,-2,2,-2,null,-2,-2,-2,null],
  pro:"Los recursos son limitados y quien lleva más tiempo contribuyendo debería ir primero.",
  con:"Discriminar por nacionalidad a residentes legales que pagan impuestos choca con la Constitución y el derecho europeo.",
  n:{VOX:"Es su propuesta de «prioridad nacional».",PP:"Defiende exigir años de residencia, no la nacionalidad."}},
 {id:"q21", t:"amb", f:"l", ax:"social", sg:-1, short:"Encarecer combustibles o limitar coches contaminantes",
  text:"Para frenar el cambio climático es aceptable encarecer los combustibles o limitar la entrada de coches contaminantes en las ciudades, aunque afecte al bolsillo de muchas familias.",
  p:[-1,1,-2,2,1,-2,1,0,1,0,0,-1],
  pro:"El cambio climático ya cuesta dinero y vidas; cuanto más se espere, más cara será la transición.",
  con:"Las familias con menos renta y del medio rural pagan el precio sin alternativas reales.",
  n:{VOX:"Rechaza las zonas de bajas emisiones y la Agenda 2030.",PP:"Pide flexibilizar las zonas de bajas emisiones."}},
 {id:"q22", t:"amb", f:"l", ax:null, sg:0, short:"Alargar la vida de las nucleares",
  text:"Las centrales nucleares deberían seguir funcionando más allá del calendario de cierre previsto, que termina en 2035.",
  p:[2,-1,2,-2,-2,null,-1,2,-2,null,-2,null],
  pro:"Producen electricidad estable sin emisiones de CO₂, algo que el apagón de abril de 2025 puso en el debate.",
  con:"Generan residuos durante miles de años y su renovación es cara frente a las renovables.",
  n:{PP:"Pide prolongar su vida, sobre todo tras el apagón de 2025.",PSOE:"Mantiene el cierre progresivo, aunque en 2026 prorrogó Almaraz hasta 2030.",JUNTS:"Apoya alargar la vida de Ascó y Vandellós."}},
 {id:"q23", t:"amb", f:"d", ax:"social", sg:-1, short:"Normas ambientales europeas sobre el campo",
  text:"Sobre las normas europeas de medio ambiente que afectan al campo (agua, pesticidas, zonas protegidas):",
  a:"Hay que flexibilizarlas para que agricultores y ganaderos no se hundan.", b:"Hay que mantenerlas o endurecerlas, aunque obliguen al sector a adaptarse.",
  aS:"flexibilizar", bS:"mantener o endurecer",
  p:[-1,1,-2,2,2,-2,1,-1,1,0,0,-1],
  pro:"El campo compite con países que no cumplen esas normas y la burocracia lo asfixia.",
  con:"Sin agua ni suelos sanos no habrá campo; la sequía ya lo demuestra.",
  n:{VOX:"Propone salir del Pacto Verde europeo.",BNG:"Defiende al pequeño productor gallego frente a la normativa y los acuerdos comerciales de la UE."}},
 {id:"q24", t:"soc", f:"l", ax:"social", sg:-1, short:"Aborto libre hasta la semana 14",
  text:"El aborto debe seguir siendo legal y gratuito a petición de la mujer hasta la semana 14, como establece la ley actual.",
  p:[1,2,-2,2,2,null,2,1,2,1,2,1],
  pro:"Garantiza la autonomía de la mujer y un acceso seguro en la sanidad pública.",
  con:"El no nacido también merece protección; se pueden reforzar las ayudas a la maternidad como alternativa.",
  n:{PP:"Acepta la ley vigente, pero rechazó blindar el aborto en la Constitución.",PSOE:"Propuso en 2025 incluir el derecho al aborto en la Constitución.",VOX:"Quiere restringirlo y reforzar la protección del no nacido."}},
 {id:"q25", t:"soc", f:"l", ax:"social", sg:-1, short:"Eutanasia para enfermos graves e incurables",
  text:"Una persona con una enfermedad grave e incurable debería poder pedir ayuda médica para morir.",
  p:[-1,2,-2,2,2,null,2,1,2,1,2,1],
  pro:"Evita sufrimientos insoportables y respeta la voluntad de la persona.",
  con:"Puede presionar a personas vulnerables; la prioridad deberían ser los cuidados paliativos.",
  n:{PSOE:"Aprobó la ley de eutanasia en 2021.",PP:"Votó en contra y la recurrió; prioriza los cuidados paliativos.",VOX:"Promete derogarla."}},
 {id:"q26", t:"soc", f:"l", ax:"social", sg:1, short:"Misma ley para toda violencia en la pareja",
  text:"La ley debería tratar igual la violencia en la pareja sea cual sea el sexo del agresor y de la víctima, en lugar de tener una ley específica de violencia de género.",
  p:[-1,-2,2,-2,-2,1,-2,-1,-2,-2,-2,-1],
  pro:"Todas las víctimas merecen la misma protección y las mismas penas para los agresores.",
  con:"La violencia contra las mujeres tiene causas propias y una ley específica ha reducido los asesinatos.",
  n:{VOX:"Propone sustituirla por una ley de violencia intrafamiliar.",PP:"Mantiene la ley de violencia de género y el Pacto de Estado."}},
 {id:"q27", t:"soc", f:"l", ax:"social", sg:-1, short:"Paridad obligatoria en listas y consejos",
  text:"Las listas electorales y los consejos de administración de las grandes empresas deben estar obligados por ley a tener paridad entre hombres y mujeres.",
  p:[0,2,-2,2,2,null,2,1,2,1,2,1],
  pro:"Sin obligación, la igualdad llega muy despacio a los puestos de poder.",
  con:"Los puestos deberían cubrirse por mérito, no por cuotas.",
  n:{PSOE:"Aprobó la Ley de Paridad en 2024.",VOX:"Votó en contra."}},
 {id:"q28", t:"soc", f:"l", ax:"social", sg:-1, short:"Revisar los acuerdos con la Santa Sede",
  text:"El Estado debería revisar los acuerdos con la Santa Sede y eliminar los privilegios fiscales de la Iglesia católica.",
  p:[-2,0,-2,2,2,null,2,0,2,-1,2,null],
  pro:"Un Estado aconfesional no debería dar ventajas a una confesión concreta.",
  con:"La Iglesia presta servicios sociales y educativos que ahorran dinero al Estado.",
  n:{SUMAR:"Pide un Estado plenamente laico.",PP:"Defiende los acuerdos vigentes."}},
 {id:"q29", t:"soc", f:"l", ax:"social", sg:-1, short:"Sin ayudas públicas a los toros",
  text:"Las corridas de toros no deberían recibir ningún tipo de ayuda ni reconocimiento público.",
  p:[-2,0,-2,2,2,null,2,1,2,null,2,null],
  pro:"El dinero público no debería financiar un espectáculo basado en el sufrimiento animal.",
  con:"Es patrimonio cultural y sostiene economías rurales y razas autóctonas.",
  n:{SUMAR:"El Ministerio de Cultura suprimió el Premio Nacional de Tauromaquia en 2024.",PP:"La considera patrimonio cultural.",VOX:"La defiende como seña de identidad."}},
 {id:"q30", t:"inst", f:"l", ax:"social", sg:1, short:"Más pena a los reincidentes en hurtos",
  text:"Deberían endurecerse las penas a quienes reinciden una y otra vez en pequeños hurtos, aunque eso aumente la población en las cárceles.",
  p:[2,1,2,-1,-2,2,0,2,-2,1,-1,1],
  pro:"Un pequeño grupo de reincidentes causa gran parte de los robos y hoy queda impune.",
  con:"La cárcel no rehabilita en delitos leves; funciona mejor la prevención y la atención social.",
  n:{JUNTS:"Ha impulsado una reforma contra la multirreincidencia.",SALF:"La seguridad es uno de sus ejes principales."}},
 {id:"q31", t:"inst", f:"l", ax:"social", sg:-1, short:"Reformar la Ley de Seguridad Ciudadana de 2015",
  text:"La Ley de Seguridad Ciudadana de 2015 debería reformarse para reducir las sanciones por protestar en la calle o grabar a la policía.",
  p:[-2,1,-2,2,2,null,2,1,2,1,2,null],
  pro:"Protege la libertad de expresión y de manifestación.",
  con:"Las fuerzas de seguridad necesitan herramientas para mantener el orden.",
  n:{PP:"La aprobó en 2015 y se opone a reformarla.",PSOE:"Prometió reformar sus aspectos más polémicos; sigue pendiente.",BILDU:"Pactó con el PSOE impulsar la reforma."}},
 {id:"q32", t:"inst", f:"d", ax:"social", sg:-1, short:"CGPJ: ¿lo eligen los jueces o el Parlamento?",
  text:"¿Quién debería elegir a la mayoría de los miembros del órgano de gobierno de los jueces (CGPJ)?",
  a:"Los propios jueces, para reforzar su independencia.", b:"El Parlamento, que representa a los ciudadanos.",
  aS:"los jueces", bS:"el Parlamento",
  p:[-2,1,-2,2,2,-2,1,1,2,0,1,0],
  pro:"Aleja a los partidos de la justicia, como recomienda la Comisión Europea.",
  con:"Evita que la judicatura, con mayoría conservadora, se gobierne a sí misma sin control democrático.",
  n:{PP:"Pactó en 2024 la renovación del CGPJ a cambio de estudiar que los jueces elijan a los jueces.",JUNTS:"Denuncia una persecución judicial al independentismo."}},
 {id:"q33", t:"inst", f:"l", ax:"social", sg:-1, short:"Referéndum entre monarquía y república",
  text:"España debería celebrar un referéndum para decidir entre monarquía y república.",
  p:[-2,-2,-2,2,2,null,2,2,2,0,2,null],
  pro:"La Jefatura del Estado debería elegirse democráticamente.",
  con:"La monarquía parlamentaria da estabilidad y ha funcionado desde 1978.",
  n:{PSOE:"Defiende la monarquía parlamentaria de la Constitución.",PODEMOS:"Lo lleva en su programa."}},
 {id:"q34", t:"ext", f:"l", ax:null, sg:0, short:"Gasto en defensa por encima del 2 %",
  text:"España debería aumentar su gasto en defensa por encima del 2 % del PIB, como piden la OTAN y la Unión Europea.",
  p:[1,0,1,-2,-2,null,-1,1,-2,1,-2,null],
  pro:"El contexto internacional obliga a Europa a defenderse por sí misma.",
  con:"Ese dinero sale de otras partidas sociales y alimenta una carrera armamentística.",
  n:{PSOE:"Alcanzó el 2 % en 2025 y rechazó el objetivo del 5 % fijado por la OTAN.",SUMAR:"Se opone al aumento del gasto militar."}},
 {id:"q35", t:"ext", f:"d", ax:null, sg:0, short:"UE: ¿más integración o más soberanía nacional?",
  text:"La Unión Europea debería…",
  a:"…devolver poder a los Estados y limitarse a ser un gran mercado común.", b:"…integrarse más, con una política fiscal y de defensa comunes.",
  aS:"más soberanía nacional", bS:"más integración",
  p:[1,2,-2,1,-1,-2,1,1,0,2,-1,1],
  pro:"Las decisiones deben tomarse cerca de los ciudadanos, que votan a sus gobiernos nacionales.",
  con:"Solo unida puede Europa competir con Estados Unidos y China.",
  n:{VOX:"Defiende una «Europa de las naciones».",PNV:"Es uno de los partidos más europeístas del Congreso."}},
 {id:"q36", t:"ext", f:"l", ax:null, sg:0, short:"Embargo de armas y sanciones a Israel",
  text:"España debería mantener el embargo de armas y las sanciones al Gobierno de Israel por su actuación en Gaza.",
  p:[-1,2,-2,2,2,-2,2,0,2,1,2,null],
  pro:"Es una forma de presionar para que se respete el derecho internacional humanitario.",
  con:"Aísla a España de aliados y dificulta su papel mediador en la región.",
  n:{PSOE:"El Gobierno aprobó un embargo de armas en 2025 y reconoció el Estado palestino en 2024.",VOX:"Apoya al Gobierno de Israel.",PODEMOS:"Pide romper todas las relaciones con Israel."}}
];
const QMAP = {}; QUESTIONS.forEach(q=>QMAP[q.id]=q);

/* «Para situarte»: cómo están hoy las cosas, en tono neutral */
const CTX = {
 q1:"Ya existe el impuesto de patrimonio, que comunidades como Madrid o Andalucía bonifican casi por completo, y desde 2022 un impuesto estatal «temporal» para patrimonios de más de 3 millones.",
 q2:"Como referencia, el IRPF recauda unos 130.000 millones al año y el gasto sanitario público ronda los 100.000 millones.",
 q3:"El Estado ya tiene empresas como Renfe, Adif o Correos y participaciones en Red Eléctrica o Enagás, pero no una compañía eléctrica propia. En vivienda, en 2025 convirtió la sociedad estatal SEPES en una empresa pública de vivienda.",
 q4:"La jornada máxima legal es de 40 horas semanales de promedio desde 1983. Muchos convenios colectivos ya fijan menos.",
 q5:"Hoy el despido improcedente se paga con 33 días de salario por año trabajado, con un máximo de 24 mensualidades.",
 q6:"En 2026 el salario mínimo es de 1.221 € brutos al mes en 14 pagas. Lo fija cada año el Gobierno tras consultar a sindicatos y patronal.",
 q7:"La Ley de Vivienda de 2023 permite a cada comunidad declarar «zonas tensionadas» y limitar allí los alquileres. Cataluña fue la primera en aplicarlo; varias comunidades se niegan a hacerlo.",
 q8:"En 2025 se terminaron unas 92.000 viviendas, frente a más de 650.000 en 2006. El alquiler social es menos del 2 % de las viviendas, frente a más del 20 % en Austria o los Países Bajos.",
 q9:"Hoy, salvo que la policía sorprenda la entrada en el momento, el propietario necesita una resolución judicial. Desde 2025 estos casos pueden tramitarse por juicio rápido.",
 q10:"Las pensiones públicas funcionan por reparto: las cotizaciones de hoy pagan las pensiones de hoy. Ahorrar aparte es voluntario o depende del convenio de cada empresa.",
 q11:"Las comunidades autónomas gestionan la sanidad. Todas derivan parte de su actividad a centros privados, pero en proporciones muy distintas.",
 q12:"Alrededor de una cuarta parte del alumnado estudia en colegios concertados: centros privados financiados con dinero público, muchos de ellos religiosos.",
 q13:"Seis comunidades tienen lengua cooficial. Los modelos van de la inmersión en catalán a sistemas con varios modelos lingüísticos o trilingües, como en Galicia.",
 q14:"La Constitución no prevé referéndums de independencia. Cataluña celebró votaciones no autorizadas en 2014 y 2017; Reino Unido pactó uno con Escocia en 2014.",
 q15:"Desde los años 80 las comunidades gestionan sanidad, educación y servicios sociales, que son la mayor parte de su gasto.",
 q16:"País Vasco y Navarra recaudan casi todos sus impuestos y pagan un «cupo» al Estado. El resto se financia con un sistema común que debía haberse reformado en 2014.",
 q17:"El indulto perdona condenas concretas. La Ley de Amnistía de 2024, la primera desde 1977, extinguió responsabilidades relacionadas con el procés catalán.",
 q18:"Se aprobó por real decreto en abril de 2026 para personas que ya vivían en España sin papeles y sin antecedentes penales, a partir de una iniciativa popular.",
 q19:"Uno de cada cinco residentes en España ha nacido en el extranjero. La mayoría de quienes están en situación irregular entraron de forma legal, por ejemplo como turistas, y se quedaron después.",
 q20:"Hoy el acceso a vivienda pública y ayudas depende de la renta y, en muchas comunidades, de llevar varios años empadronado, no de la nacionalidad.",
 q21:"La Ley de Cambio Climático de 2021 obliga a los municipios de más de 50.000 habitantes a crear zonas de bajas emisiones.",
 q22:"Los siete reactores nucleares produjeron el 19 % de la electricidad en 2025. El cierre escalonado debía empezar en 2027, pero en 2026 el Gobierno prorrogó Almaraz hasta 2030; el último cierre sigue previsto para 2035.",
 q23:"La Política Agraria Común de la UE sostiene buena parte de la renta del campo y a cambio exige requisitos ambientales.",
 q24:"La ley de 2010 permite el aborto libre hasta la semana 14, y hasta la 22 si hay riesgo grave para la mujer o anomalías fetales. Desde 2023 las jóvenes de 16 y 17 años no necesitan permiso de sus padres.",
 q25:"La eutanasia es legal desde 2021, con varios filtros médicos y una comisión de control. Se aplica en unos pocos cientos de casos al año.",
 q26:"La Ley de Violencia de Género de 2004 agrava las penas cuando el agresor es la pareja o expareja de la mujer. El Tribunal Constitucional la avaló en 2008.",
 q27:"Desde 2007 las listas deben tener al menos un 40 % de cada sexo. La ley de 2024 obliga a alternar hombres y mujeres y lleva la cuota a los consejos de las grandes empresas cotizadas.",
 q28:"Los acuerdos de 1979 con la Santa Sede regulan, entre otras cosas, las exenciones fiscales de la Iglesia. Los contribuyentes pueden destinarle el 0,7 % de su IRPF.",
 q29:"Las ayudas a los toros vienen sobre todo de ayuntamientos y comunidades autónomas. El Estado suprimió en 2024 el Premio Nacional de Tauromaquia.",
 q30:"Un hurto de menos de 400 € es un delito leve que suele castigarse con multa. El debate es qué hacer con quien acumula muchos.",
 q31:"La ley de 2015 prevé multas, entre otras cosas, por difundir imágenes de agentes que pongan en riesgo su seguridad y por protestar sin comunicarlo ante el Congreso o el Senado.",
 q32:"El CGPJ nombra a los altos cargos de la justicia. Sus 20 vocales los elige hoy el Parlamento por mayoría de tres quintos, 12 de ellos entre jueces. Estuvo sin renovar de 2018 a 2024.",
 q33:"La monarquía parlamentaria está en la Constitución de 1978. Cambiarla exige una reforma agravada: dos tercios de las dos cámaras, nuevas elecciones y referéndum.",
 q34:"Según los datos revisados de la OTAN, España gastó el 1,4 % de su PIB en defensa en 2024, de los porcentajes más bajos de la Alianza, y llegó al 2 % en 2025.",
 q35:"La UE ya tiene moneda común y política comercial común. Los impuestos y la defensa siguen siendo sobre todo competencia de cada país.",
 q36:"España reconoció el Estado palestino en 2024 y aprobó un embargo de armas a Israel en 2025. En octubre de 2025 se acordó un alto el fuego en Gaza."
};
QUESTIONS.forEach(q=> q.ctx = CTX[q.id]);

/* Propuestas a ciegas: medidas reales sin firma. No puntúan. */
const BLIND = [
 {id:"b1", text:"Dar a cada joven 20.000 € al cumplir 18 años para estudiar o emprender, financiados con impuestos a las grandes herencias y patrimonios.", who:"Sumar", detail:"La «herencia universal» de su programa de 2023.", side:"izq"},
 {id:"b2", text:"Eliminar las subvenciones públicas a partidos políticos, sindicatos y organizaciones empresariales.", who:"Vox", detail:"Recogido en su programa de 2023.", side:"der"},
 {id:"b3", text:"Un impuesto de hasta el 100 % del valor de la vivienda cuando la compra un extranjero no residente de fuera de la UE.", who:"PSOE", detail:"Anunciado por Pedro Sánchez en enero de 2025.", side:"izq"},
 {id:"b4", text:"Ajustar cada año los tramos del IRPF a la inflación, para que la subida de precios no haga pagar más impuestos.", who:"PP", detail:"Su propuesta fiscal central desde 2022 (deflactar el IRPF).", side:"der"},
 {id:"b5", text:"Rebajar al 0 % el IVA de alimentos básicos como el pan, la leche, la fruta o las verduras.", who:"Gobierno PSOE–Unidas Podemos", detail:"Lo aprobó a finales de 2022 y se aplicó de enero de 2023 a septiembre de 2024; el Gobierno PSOE–Sumar lo prorrogó.", side:"izq"},
 {id:"b6", text:"Mantener la prisión permanente revisable para los delitos más graves.", who:"PP", detail:"La introdujo en el Código Penal en 2015; Vox la apoya.", side:"der"},
 {id:"b7", text:"Transporte gratuito en trenes de Cercanías y Media Distancia para los viajeros habituales.", who:"Gobierno PSOE–Unidas Podemos", detail:"Aplicado desde septiembre de 2022.", side:"izq"},
 {id:"b8", text:"Construir una gran prisión de máxima seguridad para los delincuentes más peligrosos.", who:"Se Acabó La Fiesta", detail:"Una de las propuestas estrella de Alvise Pérez.", side:"der"},
 {id:"b9", text:"Rechazar el acuerdo comercial entre la UE y Mercosur para proteger a agricultores y ganaderos.", who:"Vox, Podemos y BNG, entre otros", detail:"Un rechazo compartido desde extremos opuestos. PSOE y PP han apoyado el acuerdo.", side:"trans"}
];

/* ============================================================
   CÁLCULO (idéntico en navegador y servidor)
   ============================================================ */
const NQ = {}; QUESTIONS.forEach(q=> NQ[q.t]=(NQ[q.t]||0)+1);
function themeWeights(points){
  points = points || {};
  const tot = THEMES.reduce((s,t)=>s+(+points[t.id]||0),0);
  const w = {}; THEMES.forEach(t=> w[t.id] = tot ? 0.3 + (+points[t.id]||0) : 1);
  return w;
}
/* answers: {q1:{v:-2..2|null, star:bool}, …}  points: {eco:0..5, …} */
function scoreAll(answers, points){
  const tw = themeWeights(points);
  const ans = QUESTIONS.filter(q=>answers[q.id] && typeof answers[q.id].v==="number").map(q=>{
    const a = answers[q.id];
    return {q, v:a.v, star:!!a.star, w: tw[q.t]/NQ[q.t]*(a.star?2:1)};
  });
  const totalW = ans.reduce((s,a)=>s+a.w,0);
  const parties = PARTIES.map((p,i)=>{
    // Sin posición conocida se cuenta como posición neutral (0), igual que hacen otros tests de afinidad
    let sw=0, sk=0, sa=0, known=0; const th={};
    ans.forEach(a=>{
      const raw=a.q.p[i], s = raw===null ? 0 : raw;
      const ag = 1-Math.abs(a.v-s)/4;
      sw+=a.w; sa+=a.w*ag;
      if(raw!==null){ sk+=a.w; known++; }
      const T = th[a.q.t] || (th[a.q.t]={w:0,a:0,k:0}); T.w+=a.w; T.a+=a.w*ag; if(raw!==null) T.k++;
    });
    const theme={}; THEMES.forEach(t=> theme[t.id] = th[t.id] && th[t.id].k ? th[t.id].a/th[t.id].w : null);
    return {i, id:p.id, score: sw ? sa/sw : 0, cover: totalW ? sk/totalW : 0, known, theme};
  });
  return {ans, tw, parties, totalW};
}
function eligibleIn(p, region){ return !p.where || !region || region==="ND" || p.where.includes(region); }
/* Partido con más afinidad entre los que se presentan en la comunidad */
function topParty(parties, region){
  let best=null;
  parties.forEach(r=>{ if(eligibleIn(PARTIES[r.i], region) && (!best || r.score>best.score)) best=r; });
  return best ? best.id : null;
}
function axisParty(i, ax){
  const xs = QUESTIONS.filter(q=>q.ax===ax && q.p[i]!==null);
  if(!xs.length) return null;
  return xs.reduce((s,q)=>s+q.p[i]*q.sg,0)/xs.length/2;
}

/* Preguntas opcionales para ponderar (solo si la persona envía sus respuestas) */
const DEMO = {
  age: [["18-29","De 18 a 29 años"],["30-44","De 30 a 44 años"],["45-64","De 45 a 64 años"],["65+","65 años o más"]],
  sex: [["F","Mujer"],["M","Hombre"],["O","Otro"]],
  vote23: [["PP","PP"],["PSOE","PSOE"],["VOX","Vox"],["SUMAR","Sumar (que entonces incluía a Podemos)"],["OTROS","Otro partido, en blanco o nulo"],["NOVOTO","No voté o no podía votar"]]
};

const SE = {DEMO, DATA_VERSION, BUDGET, MAXPTS, REGIONS, PARTIES, PIDX, THEMES, TMAP, QUESTIONS, QMAP, BLIND, themeWeights, scoreAll, eligibleIn, topParty, axisParty};
if(typeof module!=="undefined" && module.exports) module.exports = SE; else root.SE = SE;
})(typeof self!=="undefined" ? self : this);
