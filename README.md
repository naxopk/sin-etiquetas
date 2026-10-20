# Sin Etiquetas

[![Estrellas en GitHub](https://img.shields.io/github/stars/naxopk/sin-etiquetas?style=social)](https://github.com/naxopk/sin-etiquetas)
[![Pruebas](https://img.shields.io/badge/pruebas-9%2F9-2f6b4f)](test/)
[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-555)](#licencia)

**[votasinetiquetas.es](https://votasinetiquetas.es)** · Test de afinidad electoral para las elecciones generales del 29 de noviembre de 2026, con:

- **envío anónimo y voluntario** de respuestas al terminar;
- **antifraude**: comprobación antibots, límite de envíos por conexión, un envío por navegador, recálculo en el servidor y filtros de calidad;
- **registro verificable**: recibo por respuesta, sello diario encadenado, base de datos inmutable y datos abiertos;
- **dashboard público en directo**, con cifras ponderadas y sin ponderar, y una ficha técnica.

## Por qué existe

Sin Etiquetas nace de la necesidad de contribuir, aunque sea un poco, a un país mejor. Quienes lo impulsan creen que la polarización está empobreciendo el debate: se discute sobre bandos y no sobre propuestas.

El proyecto quiere que cada persona tome la decisión que quiera tomar, pero sabiendo qué defiende cada partido y sin que nadie la condicione. Tampoco este test: por eso no recomienda a quién votar, explica su método y publica sus datos.

Está pensado sobre todo para la gente joven, para que use la tecnología que tiene a su alcance para informarse y luchar por un futuro mejor. Es su granito de arena.

## Estructura

```
public/            la web (lo que ve la gente)
  index.html       página de inicio: qué es el proyecto y por qué es fiable
  test/            el test
  resultados/      el dashboard en directo
  privacidad/      la política de privacidad
  js/shared.js     preguntas, partidos, posiciones y fórmula: lo usan el navegador Y el servidor
  js/app.js        lógica del test
  js/dashboard.js  lógica del dashboard
api/               funciones de la API (sirven igual en el VPS y en Vercel)
  submit.js        recibe un envío y devuelve el recibo
  stats.js         cifras del dashboard (en caché 30 s)
  receipt.js       comprueba un recibo y da su prueba de Merkle
  dataset.js       datos abiertos de los días sellados
  config.js        configuración pública
  github.js        enlace y estrellas del repositorio (consulta GitHub una vez por hora)
  origen.js        de dónde llega la gente (Instagram…): solo totales por día, aparte de las respuestas
  cron/seal.js     sellado nocturno (Vercel)
lib/               lógica del servidor (validación, antifraude, sellos, ponderación, estadísticas)
db/schema.sql      tablas y bloqueo de cambios
db/grants.sql      permisos mínimos del usuario de la aplicación
server.js          servidor de producción para el VPS
deploy/            instalación en el VPS: script, Caddy, systemd y cortafuegos
scripts/           servidor local, sellado, datos de prueba, verificación, publicación y demo
test/              pruebas automáticas
.github/workflows/ copia diaria de los datos en GitHub con sello de OpenTimestamps
```

## Desplegarlo en Vercel + Neon (unos 15 minutos, sin terminal)

Lo que necesitas: el dominio, una cuenta de **GitHub**, una de **Vercel** y una de **Cloudflare** (las dos últimas gratis). `vercel.json` ya está preparado, con región en Fráncfort y el sellado nocturno.

1. **Proyecto**: en Vercel, *Add New → Project*, importa el repositorio y pulsa *Deploy*. No hay que tocar nada del build.
2. **Base de datos**: en el proyecto, *Storage → Create Database → Neon*, región Frankfurt, y conéctala a todos los entornos. Vercel añade `DATABASE_URL` por su cuenta. Las tablas se crean solas la primera vez que la web usa la base de datos.
3. **Antibots**: en Cloudflare, *Turnstile → Add widget*, con tu dominio y el modo *Managed*.
4. **Variables**: en *Settings → Environment Variables* añade `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `RATE_SECRET`, `CRON_SECRET` (dos textos aleatorios largos), `PUBLISHER_NAME`, `CONTACT_EMAIL` y `REPO_URL`. Después, *Deployments → ⋯ → Redeploy* para que se apliquen.
5. **Dominio**: en *Settings → Domains* añade `votasinetiquetas.es` y `www.votasinetiquetas.es` (que redirija al principal). Vercel te enseña los dos registros DNS exactos; ponlos en el panel del dominio y borra los de aparcamiento. El certificado HTTPS se emite solo.
6. **Copia independiente de los datos**: en GitHub, *Settings → Secrets and variables → Actions → Variables*, crea `SITE_URL=https://votasinetiquetas.es`.

Cada fusión en `main` se publica sola. El plan gratuito de Vercel pausa la web si se supera su límite de tráfico; si se hace viral, pasa al plan Pro.

## Alternativa: VPS de Hostinger (unos 30 minutos)

Lo que necesitas: el dominio, el VPS (KVM con **Ubuntu 24.04** y centro de datos en la Unión Europea), una cuenta de **GitHub** y una de **Cloudflare** (gratis).

1. **Sube el código a GitHub** en un repositorio público. Que sea público forma parte de la transparencia. Cambia `naxopk` en las insignias de arriba.
2. **DNS**: en el panel del dominio, borra los registros de aparcamiento que traiga y crea:

   | Tipo | Nombre | Valor | TTL |
   |---|---|---|---|
   | `A` | `@` | IPv4 del VPS | 3600 |
   | `AAAA` | `@` | IPv6 del VPS (si tiene) | 3600 |
   | `CNAME` | `www` | `votasinetiquetas.es` | 3600 |
   | `CAA` | `@` | `0 issue "letsencrypt.org"` | 3600 |
   | `CAA` | `@` | `0 issue "sectigo.com"` | 3600 |

   Los `CAA` dicen quién puede emitir el certificado: Caddy usa Let's Encrypt y, si falla, ZeroSSL (Sectigo). Comprueba que ya apuntan con `dig +short votasinetiquetas.es` antes de instalar, para que Caddy consiga el certificado a la primera.
3. **Instala** entrando por SSH como root:
   ```bash
   curl -fsSLO https://raw.githubusercontent.com/naxopk/sin-etiquetas/main/deploy/setup-vps.sh
   bash setup-vps.sh https://github.com/naxopk/sin-etiquetas.git
   ```
   El script instala Node 20, Postgres, Caddy (HTTPS automático) y el cortafuegos. También crea la base de datos con dos usuarios (uno dueño de las tablas y otro, la aplicación, con permisos mínimos), arranca el servicio y programa el sellado nocturno y una copia de seguridad diaria.
4. **Antibots**: en Cloudflare, *Turnstile → Add widget*, con tu dominio y el modo *Managed*. Pon las dos claves en `/srv/sin-etiquetas/.env`, junto con `PUBLISHER_NAME` y `CONTACT_EMAIL`, y reinicia con `systemctl restart sin-etiquetas`. Si falta algo, el servidor lo avisa al arrancar (`journalctl -u sin-etiquetas | grep AVISO`).
5. **Copia independiente de los datos**: en GitHub, *Settings → Secrets and variables → Actions → Variables*, crea `SITE_URL=https://votasinetiquetas.es`. La Action se ejecutará cada noche.
6. **Recomendado si se hace viral**: gestiona el DNS en Cloudflare con el proxy activado (nube naranja) y SSL en *Full (strict)*. Después ejecuta `bash /srv/sin-etiquetas/deploy/ufw-cloudflare.sh` y pon `TRUST_PROXY_HEADER=cf-connecting-ip` en `.env`. Cloudflare absorbe los picos de tráfico y los ataques, y el servidor solo acepta conexiones que vengan de Cloudflare.

**Para actualizar**, vuelve a ejecutar `bash setup-vps.sh …`: hace `git pull`, instala dependencias, aplica cambios de esquema y reinicia.

**Comprobaciones útiles:**
- `systemctl status sin-etiquetas` muestra el estado del servicio.
- `journalctl -u sin-etiquetas -f` muestra los registros del servidor.
- `journalctl -t sin-etiquetas-sello` muestra los sellados nocturnos.

## Antes de publicar cifras

- [x] Sustituye los valores aproximados de `lib/margins.js` por datos oficiales (INE y Ministerio del Interior) y pon `APPROXIMATE = false`. Las fuentes de cada cifra están citadas en el propio fichero.
- [ ] Revisa las posiciones de los partidos en `public/js/shared.js`. Si cambias alguna, cambia también `DATA_VERSION`.
- [ ] Consulta con un abogado si tus estadísticas pueden considerarse un sondeo (art. 69 de la LOREG) y revisa la política de privacidad. Por defecto, los resultados por partido se ocultan del 24 de noviembre a las 00:00 al 29 de noviembre a las 21:00 (cierre en Canarias).
- [x] Las fuentes (Inter y Caveat, licencia OFL) se sirven desde la propia web: ninguna visita envía su IP a Google.

## Trabajar en local

No hace falta instalar Postgres: en local se usa PGlite, un Postgres que funciona dentro de Node.

```bash
npm install
npm test                                      # pruebas automáticas
DATABASE_URL=pglite:./.pglite npm run seed -- 1500   # respuestas inventadas para ver el dashboard
DATABASE_URL=pglite:./.pglite npm run dev     # http://127.0.0.1:3000 (web + API)
node scripts/build-demo.js                    # demo/: versión estática con datos inventados, sin servidor
```

`npm run seed` se niega a ejecutarse contra una base de datos que no sea local.

## De dónde llega la gente

Para saber cuántas personas llegan desde Instagram (o TikTok, X…) y cuántas acaban enviando, sin analítica ni cookies:

- Pon en el perfil un enlace con origen: `https://votasinetiquetas.es/?utm_source=instagram&utm_medium=bio`. Para una tanda de reels, cambia la campaña: `&utm_campaign=reels-octubre`.
- Sin parámetros, la web reconoce el navegador integrado de Instagram, Facebook y TikTok (campaña `sin-utm`) y la página de la que vienes.
- El navegador recuerda el origen 30 días y avisa una vez al día (`visits`). Si la persona envía, el servidor suma uno a `submissions` de ese origen; los envíos sin origen cuentan como `directo`. Todo va a la tabla `source_counts`, por día: el origen nunca se guarda con la respuesta ni se publica.

Para ver los totales (por defecto, los últimos 30 días):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://votasinetiquetas.es/api/origen?desde=2026-10-20"
```

## Cómo se evita el fraude

| Capa | Qué frena |
|---|---|
| Cloudflare Turnstile | bots y envíos automáticos |
| Límite por conexión (10 por hora, configurable) | una persona enviando muchas veces. La IP se convierte en una huella con clave que cambia cada día y se borra a las 48 horas |
| Un envío por navegador | doble clic y reenvíos |
| Recálculo en el servidor | que alguien envíe un «resultado» inventado |
| Filtros de calidad | respuestas en menos de 90 segundos o casi todas iguales. Se guardan marcadas, no se borran, y no cuentan |

Ninguna capa garantiza «una persona, un voto» sin identificar a la gente, y eso no se hace a propósito. El objetivo es que el fraude sea caro y se note.

## Cómo se demuestra que no hay trampas

1. **Recibo**: cada respuesta tiene una huella SHA-256 de sus datos públicos en un orden fijo (`lib/ledger.js`). Es el recibo que recibe la persona.
2. **Sello diario**: cada noche se calcula la raíz de Merkle de todas las huellas del día, en orden de llegada, y se encadena con el sello anterior: `cadena = SHA-256(anterior | día | n | raíz)`.
3. **Inmutabilidad**: la base de datos rechaza cualquier modificación o borrado de respuestas y sellos. En el VPS, la aplicación funciona con un usuario que ni siquiera tiene permiso para intentarlo. Quien administra el servidor podría forzarlo, pero entonces los sellos ya publicados fuera dejarían de cuadrar.
4. **Copia externa**: la Action copia cada día sellado en este repositorio, lo verifica y sella el resultado en Bitcoin con OpenTimestamps. A partir de ahí, ni siquiera quien controla la web puede reescribir el pasado sin que se note.
5. **Comprobación por cualquiera**:
   - cada persona puede comprobar su recibo en `/resultados`. La prueba de Merkle se verifica en su propio navegador;
   - cualquiera puede descargar los datos y ejecutar `node scripts/verify.js data/days`, que recalcula huellas, raíces y cadena;
   - cualquiera puede recalcular las cifras del dashboard a partir de los datos abiertos.

## El método estadístico

Lo que se publica es **lo que responden quienes hacen el test**, no una estimación de voto. La muestra es autoseleccionada, y eso tiene dos consecuencias:

- **El margen de error clásico no es aplicable.** El ± que se muestra es orientativo: mide solo el azar, calculado como `1,96 · √(p(1−p)/n_ef)`.
- **La ponderación corrige parte del sesgo, no todo.**

**Ponderación por raking** (`lib/weighting.js`):

1. Las respuestas válidas se agrupan en celdas según comunidad, edad, sexo y voto en 2023.
2. Para cada variable, se multiplica el peso de cada celda para que la distribución ponderada coincida con la del censo. Se repite variable a variable hasta que todas cuadran a la vez (ajuste proporcional iterativo).
3. Quien no responde una variable opcional queda en «sin dato». Esa parte no se ajusta y el resto se reparte según el censo.
4. Una variable solo se usa si al menos 100 personas la han respondido. La ponderación solo se activa a partir de 300 respuestas válidas.
5. Los pesos se limitan entre 0,2 y 5. Si con ese límite la muestra no puede igualarse al censo, el dashboard lo dice y muestra la desviación que queda.
6. Se publican la **muestra efectiva de Kish**, `n_ef = (Σw)² / Σw²`, y el **efecto de diseño**, `n / n_ef`: cuánta precisión cuesta ponderar.

El **voto en 2023** es la variable que más corrige, porque compensa que participe más gente de unos partidos que de otros. Tiene un sesgo conocido: parte de la gente recuerda haber votado al ganador o no admite haberse abstenido.

**Cifras del dashboard:**
- **Primera opción**: porcentaje de participantes cuyo partido más afín es cada uno.
- **Afinidad media**: media del porcentaje de afinidad con cada partido.
- **Temas**: puntos medios en el reparto inicial.
- **Preguntas**: porcentaje a favor (o B), en contra (o A) e intermedio, más la tasa de preguntas saltadas.
- **Propuestas a ciegas**: porcentaje de apoyo y de rechazo.

Todas se muestran ponderadas y sin ponderar.

## Licencia

Código bajo licencia MIT. Los datos abiertos se publican para que cualquiera pueda verificarlos y reutilizarlos.
