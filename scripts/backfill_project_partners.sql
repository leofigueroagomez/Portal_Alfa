-- ============================================================================
-- NO EJECUTAR sin OK de Leonardo y sin respaldo previo de client_projects.
-- ============================================================================
--
-- Backfill de client_projects.commercial_partner_id a partir de las
-- cotizaciones del proyecto. Requiere aplicada la migracion
-- 20261104130000_commercial_partner_billing.sql.
--
-- Regla (misma que lib/partnerBilling.ts -> planProjectPartnerBackfill, que
-- tiene pruebas en tests/partnerBilling.test.ts):
--   - Se miran TODAS las cotizaciones del proyecto (quotes.client_project_id).
--   - Si hay mas de un aliado distinto en cualquier version -> CONFLICTO:
--     se reporta y NO se asigna (ej. 74 Jetoureast Vallarta: HQE y Kybit).
--   - Si hay un solo aliado y aparece en la(s) cotizacion(es) is_latest -> ASIGNAR.
--   - Si el unico aliado solo esta en versiones viejas (la vigente no tiene
--     aliado) -> SOLO_VERSIONES_VIEJAS: se reporta y NO se asigna.
--   - Sin aliado en ninguna cotizacion -> no se toca.
--   - Nunca sobreescribe un proyecto que ya tenga commercial_partner_id.
--   - No cambia client_projects.client_id (cliente final) ni ninguna factura.
--
-- Respaldo sugerido:
--   create table backup_20261104_client_projects_partner as
--     select id, commercial_partner_id from public.client_projects;
--
-- Rollback:
--   update public.client_projects p
--      set commercial_partner_id = b.commercial_partner_id
--     from backup_20261104_client_projects_partner b
--    where b.id = p.id;

-- ---------------------------------------------------------------------------
-- PASO 1 (solo lectura): reporte. Correr primero y revisar con Leonardo.
-- ---------------------------------------------------------------------------
with q as (
  select
    client_project_id as project_id,
    commercial_partner_id as partner_id,
    coalesce(is_latest, false) as is_latest
  from public.quotes
  where client_project_id is not null
), agg as (
  select
    project_id,
    array_agg(distinct partner_id) filter (where partner_id is not null) as all_partners,
    array_agg(distinct partner_id) filter (where partner_id is not null and is_latest) as latest_partners
  from q
  group by project_id
)
select
  p.id as project_id,
  p.name,
  p.sales_stage,
  p.client_id as final_client_id,
  c.name as final_client,
  p.commercial_partner_id as current_partner_id,
  a.all_partners,
  a.latest_partners,
  case
    when p.commercial_partner_id is not null then 'YA_TIENE_ALIADO'
    when coalesce(cardinality(a.all_partners), 0) = 0 then 'SIN_ALIADO'
    when cardinality(a.all_partners) > 1 then 'CONFLICTO'
    when coalesce(cardinality(a.latest_partners), 0) = 0 then 'SOLO_VERSIONES_VIEJAS'
    else 'ASIGNAR'
  end as decision,
  (select count(*) from public.project_invoices i where i.client_project_id = p.id) as invoices
from public.client_projects p
join agg a on a.project_id = p.id
left join public.clients c on c.id = p.client_id
where coalesce(cardinality(a.all_partners), 0) > 0
   or p.id = 62  -- Syscom 040826: cliente Ali sin aliado en la cotizacion, CONFIRMAR con Leonardo
order by decision, p.id;

-- ---------------------------------------------------------------------------
-- PASO 2: asignacion. Solo proyectos con decision = 'ASIGNAR'.
-- ---------------------------------------------------------------------------
begin;

with q as (
  select
    client_project_id as project_id,
    commercial_partner_id as partner_id,
    coalesce(is_latest, false) as is_latest
  from public.quotes
  where client_project_id is not null
), agg as (
  select
    project_id,
    array_agg(distinct partner_id) filter (where partner_id is not null) as all_partners,
    array_agg(distinct partner_id) filter (where partner_id is not null and is_latest) as latest_partners
  from q
  group by project_id
), plan as (
  select project_id, latest_partners[1] as partner_id
  from agg
  where cardinality(all_partners) = 1
    and cardinality(latest_partners) = 1
)
update public.client_projects p
   set commercial_partner_id = plan.partner_id,
       updated_at = now()
  from plan
 where p.id = plan.project_id
   and p.commercial_partner_id is null
returning p.id, p.name, p.commercial_partner_id;

-- 74 (conflicto) y 62 (sin aliado en cotizacion) se asignan a mano solo si
-- Leonardo lo confirma, por ejemplo:
--   update public.client_projects set commercial_partner_id = 2, updated_at = now() where id = 74;  -- Kybit (receptor real NOWORANGE)
--   update public.client_projects set commercial_partner_id = 1, updated_at = now() where id = 62;  -- HQE (si aplica)

commit;
