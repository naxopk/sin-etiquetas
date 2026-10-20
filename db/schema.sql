-- Sin Etiquetas · esquema de la base de datos
-- Se puede ejecutar varias veces sin romper nada.

-- Una fila por envío. Sin IP, sin datos de contacto, sin hora exacta.
create table if not exists responses (
  id           bigserial primary key,
  rid          text not null unique,            -- identificador público aleatorio
  client_id    text not null unique,            -- evita reenvíos desde el mismo navegador; NO se publica
  hour         timestamptz not null,            -- hora redondeada (UTC)
  day          date not null,                   -- día UTC: agrupa los sellos diarios
  data_version text not null,                   -- versión de preguntas y posiciones usada para calcular
  region       text not null,
  age          text,
  sex          text,
  vote23       text,
  answers      smallint[] not null,             -- 36 valores de -2 a 2; null = saltada
  stars        boolean[] not null,              -- preguntas marcadas como decisivas
  points       smallint[] not null,             -- reparto de puntos entre los 10 temas
  blind        smallint[] not null,             -- 9 propuestas a ciegas: 1, 0, -1 o null
  prediction   text,
  top          text,                            -- partido más afín (recalculado en el servidor)
  affinity     smallint[] not null,             -- afinidad 0-100 con los 12 partidos
  duration_s   integer,                         -- redondeada a decenas de segundos
  flags        text[] not null default '{}',    -- filtros de calidad: rapida, en_linea
  leaf         text not null unique             -- huella SHA-256 de la fila: es el recibo
);
create index if not exists responses_day on responses (day, id);

-- Sello diario: raíz de Merkle del día encadenada con el sello anterior.
create table if not exists seals (
  day          date primary key,
  n            integer not null,
  merkle_root  text not null,
  prev         text not null,
  chain        text not null,
  sealed_at    timestamptz not null default now()
);

-- Límite de envíos: huella de la conexión con clave que rota cada día. Se borra a las 48 horas.
create table if not exists rate_hits (
  k   text not null,
  ts  timestamptz not null default now()
);
create index if not exists rate_hits_k on rate_hits (k, ts);

-- Registro inmutable: nadie (ni siquiera la aplicación) puede editar o borrar respuestas ni sellos.
create or replace function sin_etiquetas_inmutable() returns trigger language plpgsql as $$
begin
  raise exception 'Registro inmutable: % no permitido en %', tg_op, tg_table_name;
end $$;

drop trigger if exists responses_inmutable on responses;
create trigger responses_inmutable before update or delete on responses
  for each row execute function sin_etiquetas_inmutable();

drop trigger if exists seals_inmutable on seals;
create trigger seals_inmutable before update or delete on seals
  for each row execute function sin_etiquetas_inmutable();

-- De dónde llega la gente (Instagram, TikTok…): solo totales por día, nunca unidos a una respuesta.
-- «visits»: navegadores que llegan con un origen conocido (una vez al día cada uno).
-- «submissions»: envíos aceptados, contados en el servidor; los que no traen origen van como «directo».
create table if not exists source_counts (
  day          date not null,
  source       text not null,
  campaign     text not null default '',
  visits       integer not null default 0,
  submissions  integer not null default 0,
  primary key (day, source, campaign)
);
