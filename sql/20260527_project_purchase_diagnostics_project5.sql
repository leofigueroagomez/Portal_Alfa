-- Diagnostico de lineas de compra del proyecto 5.
select
  ppl.id as purchase_line_id,
  ppl.client_project_id,
  ppl.quote_item_id,
  ppl.product_id,
  ppl.product_brand,
  ppl.product_model,
  ppl.product_name,
  ppl.quantity_required,
  ppl.quantity_purchased,
  ppl.unit_cost as purchase_line_unit_cost,
  ppl.cost_currency as purchase_line_cost_currency,
  ppl.total_required_cost,
  ppl.total_purchased_cost,
  ppl.total_pending_cost,
  ppl.purchase_status
from public.project_purchase_lines ppl
where ppl.client_project_id = 5
order by ppl.supplier nulls last, ppl.product_brand, ppl.product_model;

-- Quote items aprobados relacionados al proyecto 5.
select
  q.id as quote_id,
  q.quote_number,
  q.status,
  q.exchange_rate,
  qi.id as quote_item_id,
  qi.product_id,
  qi.quantity,
  qi.sale_currency,
  qi.unit_equipment_price,
  qi.unit_equipment_price_usd,
  qi.product_brand,
  qi.product_model,
  qi.product_name
from public.quotes q
join public.quote_items qi on qi.quote_id = q.id
where q.client_project_id = 5
  and q.status = 'approved'
order by q.id, qi.id;

-- Producto Panduit NK2FNWH en catalogo.
select
  p.id as product_id,
  p.supplier,
  p.brand,
  p.model,
  p.name,
  p.cost_price,
  p.cost_currency,
  p.calculated_sale_price,
  p.sale_currency
from public.products p
where p.brand ilike '%panduit%'
   or p.model ilike '%NK2FNWH%'
   or p.name ilike '%NK2FNWH%'
order by p.brand, p.model;

-- Comparativo especifico entre lineas, quote_items y producto para Panduit/NK2FNWH.
select
  ppl.id as purchase_line_id,
  ppl.unit_cost as line_unit_cost,
  ppl.cost_currency as line_cost_currency,
  qi.id as quote_item_id,
  qi.sale_currency as quote_sale_currency,
  qi.unit_equipment_price,
  qi.unit_equipment_price_usd,
  p.id as product_id,
  p.cost_price as product_cost_price,
  p.cost_currency as product_cost_currency
from public.project_purchase_lines ppl
left join public.quote_items qi on qi.id = ppl.quote_item_id
left join public.products p on p.id = coalesce(ppl.product_id, qi.product_id)
where ppl.client_project_id = 5
  and (
    ppl.product_brand ilike '%panduit%'
    or ppl.product_model ilike '%NK2FNWH%'
    or ppl.product_name ilike '%NK2FNWH%'
    or p.model ilike '%NK2FNWH%'
  )
order by ppl.id;
