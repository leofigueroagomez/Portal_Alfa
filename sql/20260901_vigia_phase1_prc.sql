-- El Vigia de ALFA OS - Sprint C3: Sensores de proceso (PRC-*)
--
-- Miden si un proyecto ganado esta avanzando. Alimentan el score de riesgo (D1).
--   PRC-01: proyecto ganado atorado en compras (alcance definido, casi nada comprado, sin movimiento)
--   PRC-02: proyecto ganado con alcance pero sin base de compras generada
--
-- Cambio aditivo: solo crea/reemplaza vistas public.vigia_v_*.
-- No modifica ninguna tabla ni dato. El ciclo de vida del proyecto se rastrea
-- por client_projects.sales_stage ('won' = en ejecucion; luego 'delivered'/'warranty').

-- PRC-01 - Proyecto ganado atorado en compras
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
  and a.req_cost >= 3000
  and a.pend_cost / nullif(a.req_cost, 0) >= 0.9
  and coalesce(le.last_event_at, cp.created_at) < now() - interval '21 days'
order by a.pend_cost desc;

-- PRC-02 - Proyecto ganado con alcance pero sin base de compras
create or replace view public.vigia_v_prc02_won_without_procurement as
with op as (
  select client_project_id, count(*) as op_count
  from public.project_operational_items
  where status <> 'deleted'
  group by client_project_id
)
select
  cp.id as client_project_id,
  cp.name,
  cp.created_at,
  round(extract(epoch from (now() - cp.created_at)) / 86400)::int as project_age_days,
  coalesce(op.op_count, 0) as operational_item_count
from public.client_projects cp
left join op on op.client_project_id = cp.id
where cp.sales_stage = 'won'
  and cp.created_at < now() - interval '40 days'
  and coalesce(op.op_count, 0) >= 5
  and not exists (
    select 1 from public.project_purchase_lines l where l.client_project_id = cp.id
  )
order by op.op_count desc;

notify pgrst, 'reload schema';
