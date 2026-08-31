-- El Vigia de ALFA OS - Fase 1, segundo lote de sensores.
--
-- Anade 8 vistas de deteccion (INT-05..10, CST-04..05) sobre los mismos frentes:
-- integridad de datos y costos/margenes. Casi todas nacen en silencio (los datos
-- estan limpios hoy) y actuan como guardas: disparan el dia que algo se rompe.
--
-- Cambio aditivo: solo crea/reemplaza vistas vigia_v_*. No toca ninguna tabla,
-- columna, RLS ni datos. Aplicado a produccion el 2026-08-31.

-- INT-05 - Compra en USD sin tipo de cambio (rompe todo el calculo de costo real en MXN)
create or replace view public.vigia_v_int05_purchase_missing_fx as
select
  e.id as event_id,
  e.project_purchase_line_id as line_id,
  l.client_project_id,
  l.product_brand,
  l.product_model,
  e.purchase_date,
  e.quantity,
  e.unit_cost,
  e.cost_currency
from public.project_purchase_events e
join public.project_purchase_lines l on l.id = e.project_purchase_line_id
where upper(coalesce(e.cost_currency, 'USD')) = 'USD'
  and coalesce(e.exchange_rate, 0) <= 0
  and coalesce(e.quantity, 0) > 0;

-- INT-06 - Partida operativa en USD sin tipo de cambio, con compra pendiente
create or replace view public.vigia_v_int06_operational_missing_fx as
select
  o.id as operational_item_id,
  o.client_project_id,
  o.product_id,
  o.product_brand,
  o.product_model,
  o.operational_unit_cost,
  o.cost_currency,
  sum(l.quantity_required - l.quantity_purchased) as pending_qty
from public.project_operational_items o
join public.project_purchase_lines l on l.project_operational_item_id = o.id
where o.status <> 'deleted'
  and upper(coalesce(o.cost_currency, 'USD')) = 'USD'
  and coalesce(o.exchange_rate, 0) <= 0
  and coalesce(o.operational_unit_cost, 0) > 0
  and l.quantity_purchased < l.quantity_required
group by o.id, o.client_project_id, o.product_id, o.product_brand, o.product_model,
         o.operational_unit_cost, o.cost_currency;

-- INT-07 - Cotizacion aprobada sin proyecto vinculado
create or replace view public.vigia_v_int07_approved_quote_no_project as
select q.id as quote_id, q.version, q.created_at, q.grand_total, q.total_mxn
from public.quotes q
where q.status = 'approved' and q.client_project_id is null;

-- INT-08 - Proyecto ganado o entregado sin cotizacion aprobada
create or replace view public.vigia_v_int08_won_project_no_approved_quote as
select cp.id as client_project_id, cp.name, cp.sales_stage
from public.client_projects cp
where cp.sales_stage in ('won', 'delivered')
  and not exists (
    select 1 from public.quotes q
    where q.client_project_id = cp.id and q.status = 'approved'
  );

-- INT-09 - Total estimado guardado en la linea de compra desincronizado del calculo
create or replace view public.vigia_v_int09_purchase_line_total_drift as
select
  l.id as line_id,
  l.client_project_id,
  l.product_brand,
  l.product_model,
  l.unit_cost,
  l.quantity_required,
  l.total_required_cost,
  round(coalesce(l.unit_cost, 0) * coalesce(l.quantity_required, 0), 2) as expected_total,
  round(coalesce(l.total_required_cost, 0) - coalesce(l.unit_cost, 0) * coalesce(l.quantity_required, 0), 2) as drift
from public.project_purchase_lines l
where abs(coalesce(l.total_required_cost, 0) - coalesce(l.unit_cost, 0) * coalesce(l.quantity_required, 0))
      > greatest(1, coalesce(l.unit_cost, 0) * coalesce(l.quantity_required, 0) * 0.02);

-- INT-10 - La cantidad de la partida operativa no coincide con la del quote_item que la origino
create or replace view public.vigia_v_int10_operational_qty_vs_quote as
select
  o.id as operational_item_id,
  o.client_project_id,
  o.product_brand,
  o.product_model,
  o.quantity as operational_qty,
  qi.quantity as quote_qty,
  o.source_quote_item_id
from public.project_operational_items o
join public.quote_items qi on qi.id = o.source_quote_item_id
join public.quotes q on q.id = qi.quote_id
where o.status <> 'deleted'
  and o.change_origin = 'quote_seed'
  and q.status = 'approved'
  and coalesce(o.quantity, 0) <> coalesce(qi.quantity, 0);

-- CST-04 - Producto activo sin costo, usado en cotizacion aprobada vigente o compra pendiente
create or replace view public.vigia_v_cst04_product_without_cost_in_use as
with in_approved_latest as (
  select distinct qi.product_id
  from public.quote_items qi
  join public.quotes q on q.id = qi.quote_id
  join public.client_projects cp on cp.id = q.client_project_id
  where q.status = 'approved'
    and coalesce(q.is_latest, false) = true
    and cp.sales_stage in ('won', 'delivered')
    and coalesce(qi.existing_customer_equipment, false) = false
),
in_pending_purchase as (
  select distinct l.product_id
  from public.project_purchase_lines l
  join public.client_projects cp on cp.id = l.client_project_id
  where cp.sales_stage in ('won', 'delivered')
    and coalesce(l.quantity_purchased, 0) < l.quantity_required
)
select
  p.id as product_id,
  p.brand,
  p.model,
  p.name,
  p.supplier,
  (p.id in (select product_id from in_approved_latest)) as in_approved_quote,
  (p.id in (select product_id from in_pending_purchase)) as in_pending_purchase
from public.products p
where p.is_active = true
  and coalesce(p.cost_price, 0) <= 0
  -- excluir servicios / ingenieria de ALFA: su base es mano de obra, no costo de equipo
  and coalesce(p.labor_unit_cost, 0) <= 0
  and coalesce(p.brand, '') not ilike 'ALFA%'
  and (
    p.id in (select product_id from in_approved_latest)
    or p.id in (select product_id from in_pending_purchase)
  );

-- CST-05 - Sobrecosto acumulado de compras a nivel proyecto (rollup de CST-01)
create or replace view public.vigia_v_cst05_project_purchase_overrun_total as
with per_event as (
  select
    l.client_project_id,
    greatest(
      (
        case when upper(coalesce(e.cost_currency, 'USD')) = 'USD'
             then e.unit_cost * coalesce(nullif(e.exchange_rate, 0), 0)
             else e.unit_cost end
        - case when upper(coalesce(o.cost_currency, 'USD')) = 'USD'
               then coalesce(o.operational_unit_cost, 0) * coalesce(nullif(o.exchange_rate, 0), 0)
               else coalesce(o.operational_unit_cost, 0) end
      ) * e.quantity,
      0
    ) as overrun_mxn
  from public.project_purchase_events e
  join public.project_purchase_lines l on l.id = e.project_purchase_line_id
  join public.project_operational_items o on o.id = l.project_operational_item_id
  where coalesce(e.quantity, 0) > 0
)
select
  client_project_id,
  round(sum(overrun_mxn), 2) as overrun_total_mxn,
  count(*) filter (where overrun_mxn > 0) as overrun_event_count
from per_event
group by client_project_id
having sum(overrun_mxn) > 300;

notify pgrst, 'reload schema';
