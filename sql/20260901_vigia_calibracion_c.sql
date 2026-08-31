-- El Vigia - Calibracion de Sprint C (2026-09-01)
--
-- El primer brief con VTA/SRV/PRC traia ~32 hallazgos de golpe. Esta migracion
-- estrecha el alcance de los sensores mas ruidosos para que el brief sea util
-- desde el dia 1. Solo reemplaza vistas; no toca datos.
--
--   VTA-03: 15 -> ~5. Solo dispara si la cotizacion aprobada del proyecto vale
--           >= $25,000 MXN. Los trabajos chicos ($800-$7k) sin anticipo formal
--           registrado son ruido: no se persigue un anticipo de un servicio de $1,500.
--   PRC-01: 6 -> ~4. Sube el piso de costo ($3k -> $5k) y exige que quede
--           >= 95% del equipo sin comprar (antes 90%), para no marcar proyectos
--           que ya arrancaron compras.

-- VTA-03 recalibrado
create or replace view public.vigia_v_vta03_won_project_missing_deposit as
select
  cp.id as client_project_id,
  cp.name,
  cp.client_id,
  cp.sales_stage,
  cp.created_at,
  round(extract(epoch from (now() - cp.created_at)) / 86400, 1) as age_days,
  coalesce((
    select sum(coalesce(p.amount_mxn, p.amount))
    from public.project_payments p
    where p.client_project_id = cp.id
  ), 0) as total_paid_mxn,
  coalesce((
    select max(coalesce(q.total_mxn, q.grand_total_mxn, q.grand_total))
    from public.quotes q
    where q.client_project_id = cp.id and q.status = 'approved'
  ), 0) as approved_quote_mxn
from public.client_projects cp
where cp.sales_stage = 'won'
  and cp.created_at < now() - interval '10 days'
  and not exists (
    select 1 from public.project_payments p
    where p.client_project_id = cp.id and p.amount > 0
  )
  and coalesce((
    select max(coalesce(q.total_mxn, q.grand_total_mxn, q.grand_total))
    from public.quotes q
    where q.client_project_id = cp.id and q.status = 'approved'
  ), 0) >= 25000
order by approved_quote_mxn desc;

-- PRC-01 recalibrado
create or replace view public.vigia_v_prc01_stalled_procurement as
with agg as (
  select
    l.client_project_id,
    count(*) as line_count,
    sum(coalesce(l.total_required_cost, 0)) as req_cost,
    sum(coalesce(l.total_pending_cost, 0)) as pend_cost,
    sum(coalesce(l.quantity_purchased, 0)) as qty_purchased
  from public.project_purchase_lines l
  group by l.client_project_id
),
last_event as (
  select l.client_project_id, max(e.created_at) as last_event_at
  from public.project_purchase_events e
  join public.project_purchase_lines l on l.id = e.project_purchase_line_id
  group by l.client_project_id
)
select
  cp.id as client_project_id,
  cp.name,
  cp.created_at,
  round(extract(epoch from (now() - cp.created_at)) / 86400)::int as project_age_days,
  a.line_count,
  a.req_cost,
  a.pend_cost,
  a.qty_purchased,
  round(a.pend_cost / nullif(a.req_cost, 0), 3) as pending_ratio,
  le.last_event_at,
  round(extract(epoch from (now() - coalesce(le.last_event_at, cp.created_at))) / 86400)::int as days_since_purchase
from public.client_projects cp
join agg a on a.client_project_id = cp.id
left join last_event le on le.client_project_id = cp.id
where cp.sales_stage = 'won'
  and cp.created_at < now() - interval '45 days'
  and a.req_cost >= 5000
  and a.pend_cost / nullif(a.req_cost, 0) >= 0.95
  and coalesce(le.last_event_at, cp.created_at) < now() - interval '21 days'
order by a.pend_cost desc;

notify pgrst, 'reload schema';
