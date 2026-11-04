-- CHECK: complemento issued/stamped => project_payment_id not null.
--
-- APLICAR SOLO DESPUES de correr sql/20261104_backfill_complement_payments.sql
-- en modo apply y de revisar los casos ambiguos que reporte.
-- Se agrega NOT VALID (sin bloquear la tabla) y luego se valida; si VALIDATE
-- falla, quedan complementos timbrados sin pago: ligarlos a mano y reintentar.
-- Para revisar antes:
--   select id, client_project_id, status from public.project_payment_complements
--   where status in ('issued', 'stamped') and project_payment_id is null;

alter table public.project_payment_complements
  drop constraint if exists project_payment_complements_stamped_requires_payment;

alter table public.project_payment_complements
  add constraint project_payment_complements_stamped_requires_payment
    check (status not in ('issued', 'stamped') or project_payment_id is not null)
    not valid;

alter table public.project_payment_complements
  validate constraint project_payment_complements_stamped_requires_payment;
