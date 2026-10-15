-- Permisos mínimos para el usuario con el que funciona la aplicación (se_app).
-- Las tablas pertenecen a se_admin, que solo se usa para instalar y actualizar el esquema.
-- Así, aunque alguien tomara el control de la aplicación, no podría modificar ni borrar respuestas,
-- ni desactivar los disparadores que lo impiden.
revoke all on responses, seals, rate_hits from se_app;
grant select, insert on responses, seals to se_app;
grant select, insert, delete on rate_hits to se_app;
grant usage, select on sequence responses_id_seq to se_app;
