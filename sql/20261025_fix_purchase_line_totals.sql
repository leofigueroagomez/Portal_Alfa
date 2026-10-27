-- Recalculo de totales de lineas de compra con conversion de moneda.
--
-- Contexto: project_purchase_lines.total_purchased_cost se calculaba sumando
-- quantity x unit_cost de cada project_purchase_event SIN convertir moneda. Una
-- linea en USD con compras capturadas en MXN quedaba con pesos guardados como
-- dolares (caso real: proyecto 18, linea 365, evento 113 = 6 x $80.43 MXN ->
-- total_purchased_cost 482.58 "USD").
--
-- Logica nueva (identica a computePurchaseLineTotals en lib/projectPurchases.ts):
--   * total_purchased_cost queda en la moneda de la LINEA. Cada evento se convierte:
--       MXN -> USD  divide entre el TC del evento; USD -> MXN  multiplica.
--     Si el evento no trae TC (las compras en MXN nunca lo guardan) se usa el TC de
--     referencia de la partida operativa (project_operational_items.exchange_rate).
--     Si tampoco hay TC de referencia, ese evento queda fuera del total en moneda de
--     la linea (pero si entra en total_purchased_cost_mxn cuando es MXN).
--   * total_purchased_cost_mxn (columna nueva): cada evento en MXN con su propia
--     moneda y TC. Es el numero exacto cuando la conversion uso TC de referencia.
--   * total_pending_cost: misma formula de siempre (requerido - cantidad comprada
--     en eventos x costo estimado), en moneda de la linea.
--   No toca quantity_purchased, purchase_status, supplier ni ningun calculo de
--   rentabilidad.
--
-- Idempotente: la columna se crea con IF NOT EXISTS y el UPDATE solo escribe las
-- lineas cuyo valor cambia; correrlo dos veces no modifica nada la segunda vez.
--
-- Orden de uso:
--   1. Respaldo de project_purchase_lines (ver paso 0).
--   2. Correr la SECCION A (solo lectura) y revisar la lista de lineas que cambian.
--   3. Correr la SECCION B (escritura, en transaccion).
--   4. Correr la SECCION A de nuevo: debe regresar 0 filas.
--
-- Rentabilidad: lib/projectProfitability.ts ya suma total_purchased_cost_mxn (con
-- respaldo desde eventos si viene null), asi que este script no cambia la
-- rentabilidad calculada. Desplegar ese cambio de codigo ANTES de correr la
-- SECCION B; con el codigo anterior, rentabilidad contaria USD como MXN.

-- ---------------------------------------------------------------------------
-- Paso 0 (manual, recomendado): respaldo
-- ---------------------------------------------------------------------------
-- create table if not exists public.bkp_20261025_purchase_line_totals as
--   select id, total_purchased_cost, total_pending_cost, updated_at
--   from public.project_purchase_lines;
-- -- Sin esto la tabla queda expuesta por PostgREST (default privileges):
-- alter table public.bkp_20261025_purchase_line_totals enable row level security;
-- revoke all on public.bkp_20261025_purchase_line_totals from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Calculo compartido por ambas secciones
-- ---------------------------------------------------------------------------
create or replace temp view _purchase_line_new_totals as
with lines as (
  select
    l.id,
    l.client_project_id,
    l.product_brand,
    l.product_model,
    case when upper(coalesce(l.cost_currency, 'USD')) = 'MXN' then 'MXN' else 'USD' end as line_currency,
    l.quantity_required,
    l.quantity_purchased,
    l.total_required_cost,
    l.total_purchased_cost,
    l.total_pending_cost,
    case when coalesce(l.quantity_required, 0) > 0
         then coalesce(l.total_required_cost, 0) / l.quantity_required
         else coalesce(l.unit_cost, 0) end as estimated_unit_cost,
    nullif(o.exchange_rate, 0) as reference_rate
  from public.project_purchase_lines l
  left join public.project_operational_items o on o.id = l.project_operational_item_id
),
events as (
  select
    e.project_purchase_line_id as line_id,
    coalesce(e.quantity, 0) as quantity,
    coalesce(e.quantity, 0) * coalesce(e.unit_cost, 0) as amount,
    case when upper(coalesce(e.cost_currency, li.line_currency)) = 'MXN' then 'MXN' else 'USD' end as event_currency,
    li.line_currency,
    nullif(e.exchange_rate, 0) as event_rate,
    li.reference_rate
  from public.project_purchase_events e
  join lines li on li.id = e.project_purchase_line_id
),
converted as (
  select
    line_id,
    quantity,
    event_currency,
    line_currency,
    coalesce(event_rate, reference_rate) as rate,
    event_rate is null and event_currency <> line_currency as used_reference_or_missing,
    case
      when event_currency = line_currency then amount
      when coalesce(event_rate, reference_rate) is null then null
      when event_currency = 'MXN' then amount / coalesce(event_rate, reference_rate)
      else amount * coalesce(event_rate, reference_rate)
    end as amount_line_currency,
    case
      when event_currency = 'MXN' then amount
      when coalesce(event_rate, reference_rate) is null then null
      else amount * coalesce(event_rate, reference_rate)
    end as amount_mxn
  from events
),
agg as (
  select
    line_id,
    sum(quantity) as events_quantity,
    sum(coalesce(amount_line_currency, 0)) as total_line_currency,
    case when bool_or(amount_mxn is null) then null else sum(amount_mxn) end as total_mxn,
    bool_or(used_reference_or_missing) as fx_approximate,
    bool_or(amount_line_currency is null) as missing_rate,
    count(*) filter (where event_currency <> line_currency) as cross_currency_events
  from converted
  group by line_id
)
select
  li.id as line_id,
  li.client_project_id,
  li.product_brand,
  li.product_model,
  li.line_currency,
  li.quantity_purchased as stored_quantity_purchased,
  coalesce(a.events_quantity, 0) as events_quantity,
  li.total_purchased_cost as old_total_purchased_cost,
  round(coalesce(a.total_line_currency, 0), 2) as new_total_purchased_cost,
  case when a.line_id is null then 0 else round(a.total_mxn, 2) end as new_total_purchased_cost_mxn,
  li.total_pending_cost as old_total_pending_cost,
  round(greatest(
    coalesce(li.total_required_cost, 0) - coalesce(a.events_quantity, 0) * li.estimated_unit_cost,
    0
  ), 2) as new_total_pending_cost,
  coalesce(a.cross_currency_events, 0) as cross_currency_events,
  coalesce(a.fx_approximate, false) as fx_approximate,
  coalesce(a.missing_rate, false) as missing_rate,
  li.reference_rate
from lines li
left join agg a on a.line_id = li.id;

-- ---------------------------------------------------------------------------
-- SECCION A (solo lectura): lineas que cambiarian, con valor anterior y nuevo
-- ---------------------------------------------------------------------------
select
  line_id,
  client_project_id,
  product_brand,
  product_model,
  line_currency,
  old_total_purchased_cost,
  new_total_purchased_cost,
  new_total_purchased_cost_mxn,
  old_total_pending_cost,
  new_total_pending_cost,
  cross_currency_events,
  fx_approximate,
  missing_rate,
  stored_quantity_purchased <> events_quantity as quantity_drift
from _purchase_line_new_totals
where old_total_purchased_cost is distinct from new_total_purchased_cost
   or old_total_pending_cost is distinct from new_total_pending_cost
order by client_project_id, line_id;

-- ---------------------------------------------------------------------------
-- SECCION B (escritura): aplicar
-- ---------------------------------------------------------------------------
begin;

alter table public.project_purchase_lines
  add column if not exists total_purchased_cost_mxn numeric(14,2);

comment on column public.project_purchase_lines.total_purchased_cost_mxn is
  'Comprado en MXN: cada evento con su propia moneda y TC (TC de la partida operativa si el evento no trae). Lo escribe recalculatePurchaseLineTotals.';

update public.project_purchase_lines l
set total_purchased_cost = n.new_total_purchased_cost,
    total_purchased_cost_mxn = n.new_total_purchased_cost_mxn,
    total_pending_cost = n.new_total_pending_cost,
    updated_at = now()
from _purchase_line_new_totals n
where l.id = n.line_id
  and (
    l.total_purchased_cost is distinct from n.new_total_purchased_cost
    or l.total_purchased_cost_mxn is distinct from n.new_total_purchased_cost_mxn
    or l.total_pending_cost is distinct from n.new_total_pending_cost
  );

-- Verificacion: no debe quedar ninguna linea distinta del calculo.
do $$
declare
  v_pending integer;
begin
  select count(*) into v_pending
  from public.project_purchase_lines l
  join _purchase_line_new_totals n on n.line_id = l.id
  where l.total_purchased_cost is distinct from n.new_total_purchased_cost
     or l.total_purchased_cost_mxn is distinct from n.new_total_purchased_cost_mxn
     or l.total_pending_cost is distinct from n.new_total_pending_cost;

  if v_pending > 0 then
    raise exception 'Abortado: % lineas siguen distintas del calculo.', v_pending;
  end if;
end $$;

commit;

notify pgrst, 'reload schema';
