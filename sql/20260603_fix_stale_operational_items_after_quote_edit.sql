-- Corrige partidas duplicadas cuando una cotizacion aprobada se edita y sus quote_items
-- fueron recreados con nuevos IDs.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'project_operational_items'
  ) then
    alter table public.project_operational_items
      drop constraint if exists project_operational_items_status_check;

    alter table public.project_operational_items
      add constraint project_operational_items_status_check
      check (status in (
        'draft',
        'active',
        'locked',
        'purchased',
        'partially_purchased',
        'delivered',
        'pending_director_approval',
        'deleted'
      ));
  end if;
end $$;

with current_approved_quote_items as (
  select
    q.client_project_id,
    qi.id as quote_item_id
  from public.quotes q
  join public.quote_items qi on qi.quote_id = q.id
  where q.status = 'approved'
    and q.client_project_id is not null
),
stale_operational_items as (
  select poi.id
  from public.project_operational_items poi
  join public.quotes q on q.id = poi.source_quote_id
  left join current_approved_quote_items current_items
    on current_items.client_project_id = poi.client_project_id
   and current_items.quote_item_id = poi.source_quote_item_id
  where q.status = 'approved'
    and poi.change_origin = 'quote_seed'
    and poi.status not in ('purchased', 'partially_purchased', 'delivered', 'deleted')
    and (
      poi.source_quote_item_id is null
      or current_items.quote_item_id is null
    )
)
update public.project_operational_items poi
set
  status = 'deleted',
  updated_at = now()
from stale_operational_items stale
where poi.id = stale.id;

with active_operational_items as (
  select id
  from public.project_operational_items
  where status <> 'deleted'
),
stale_open_purchase_lines as (
  select ppl.id
  from public.project_purchase_lines ppl
  left join active_operational_items active_items
    on active_items.id = ppl.project_operational_item_id
  where coalesce(ppl.quantity_purchased, 0) <= 0
    and ppl.project_operational_item_id is not null
    and active_items.id is null
)
delete from public.project_purchase_lines ppl
using stale_open_purchase_lines stale
where ppl.id = stale.id;

-- Diagnostico puntual para revisar el proyecto 16 despues de ejecutar:
-- select id, source_quote_id, source_quote_item_id, product_brand, product_model, product_name, quantity, status
-- from public.project_operational_items
-- where client_project_id = 16
-- order by product_brand, product_model, id;
--
-- select id, quote_item_id, project_operational_item_id, product_brand, product_model, product_name, quantity_required, quantity_purchased
-- from public.project_purchase_lines
-- where client_project_id = 16
-- order by product_brand, product_model, id;
