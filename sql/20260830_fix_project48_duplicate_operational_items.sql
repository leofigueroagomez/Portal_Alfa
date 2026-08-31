-- Reparacion puntual proyecto 48: cantidades requeridas duplicadas en Compras de equipo.
--
-- Causa raiz:
--   El proyecto 48 tiene DOS juegos activos de project_operational_items para el mismo
--   alcance:
--     * Juego conservado (ids 537-550): sembrado el 2026-08-22, hoy con
--       source_quote_id / source_quote_item_id en NULL (huerfano) tras recrearse los
--       quote_items de la cotizacion. Es el juego EN USO: tiene mano de obra asignada
--       en la orden de trabajo 17.
--     * Juego duplicado (ids 551-564): creado por syncProjectOperationalItems a partir
--       de la cotizacion aprobada 156 (quote_items 6713-6726). Mano de obra en pending,
--       sin OT, sin compras.
--   La pagina de Compras consolida por producto y SUMA quantity_required de ambos juegos
--   -> cada cantidad aparece x2 (NVR 1 -> 2, camaras 3 -> 6, etc.).
--
-- Estrategia: conservar el juego en uso (537-550), re-vincularlo a la cotizacion 156 y
-- eliminar el juego duplicado (551-564) junto con sus lineas de compra. Es la misma
-- estrategia de "adopcion de huerfanos" que ahora aplica lib/projectOperationalItems.ts
-- para evitar la recurrencia.
--
-- Requisitos: respaldo previo. No hay compras (project_purchase_events) ni entregas de
-- material ligadas al proyecto 48 al momento de escribir este script; el bloque 0 aborta
-- si eso cambio.

begin;

-- 0. Salvaguardas.
do $$
begin
  if exists (
    select 1
    from project_purchase_events e
    join project_purchase_lines l on l.id = e.project_purchase_line_id
    where l.client_project_id = 48
  ) then
    raise exception 'Abortado: existen project_purchase_events en el proyecto 48; revisar manualmente.';
  end if;

  if exists (
    select 1
    from project_material_delivery_items i
    join project_purchase_lines l on l.id = i.project_purchase_line_id
    where l.client_project_id = 48
  ) then
    raise exception 'Abortado: hay entregas de material ligadas a compras del proyecto 48; revisar manualmente.';
  end if;

  if (
    select count(*) from project_operational_items
    where client_project_id = 48 and id between 537 and 550 and status <> 'deleted'
  ) <> 14 then
    raise exception 'Abortado: el juego conservado (537-550) ya no tiene 14 partidas activas.';
  end if;

  if (
    select count(*) from project_operational_items
    where client_project_id = 48 and id between 551 and 564
      and source_quote_id = 156 and status <> 'deleted'
  ) <> 14 then
    raise exception 'Abortado: el juego duplicado (551-564 / cotizacion 156) ya no tiene 14 partidas activas.';
  end if;
end $$;

-- 1. Borrar las lineas de compra del juego duplicado (quote_item_id 6713-6726).
delete from project_purchase_lines
where client_project_id = 48
  and quote_item_id between 6713 and 6726;

-- 2. Borrar las partidas operativas duplicadas. El FK
--    project_operational_item_labor_activities.project_operational_item_id es ON DELETE
--    CASCADE, asi que sus actividades de mano de obra (pending, sin OT) se eliminan solas.
delete from project_operational_items
where client_project_id = 48
  and id between 551 and 564
  and source_quote_id = 156;

-- 3. Sellar la referencia de mano de obra en el juego conservado para que el sync
--    reconozca las actividades ya existentes (provenientes de la cotizacion 93) y no
--    inserte duplicados desde la 156.
update project_operational_item_labor_activities la
set source_quote_item_labor_activity_id = qila.id
from project_operational_items a
join quote_items qi on qi.quote_id = 156 and qi.product_id = a.product_id
join quote_item_labor_activities qila on qila.quote_item_id = qi.id
where la.project_operational_item_id = a.id
  and a.client_project_id = 48
  and a.id between 537 and 550
  and la.source_quote_item_labor_activity_id is null;

-- 4. Re-vincular el juego conservado a la cotizacion aprobada 156.
update project_operational_items a
set source_quote_id = 156,
    source_quote_item_id = qi.id,
    exchange_rate = 16.922845,
    status = 'active',
    updated_at = now()
from quote_items qi
where qi.quote_id = 156
  and qi.product_id = a.product_id
  and a.client_project_id = 48
  and a.id between 537 and 550;

-- 5. Re-vincular las lineas de compra conservadas a los quote_items de la 156.
update project_purchase_lines l
set quote_item_id = qi.id,
    updated_at = now()
from project_operational_items a
join quote_items qi on qi.quote_id = 156 and qi.product_id = a.product_id
where l.project_operational_item_id = a.id
  and l.client_project_id = 48
  and l.quote_item_id is null
  and a.id between 537 and 550;

-- 6. Verificacion final.
do $$
declare
  op_count int;
  line_count int;
  dup_products int;
  unlinked_ops int;
  unlinked_lines int;
begin
  select count(*) into op_count
  from project_operational_items
  where client_project_id = 48 and status <> 'deleted';

  select count(*) into line_count
  from project_purchase_lines
  where client_project_id = 48;

  select count(*) into dup_products from (
    select 1 from project_purchase_lines
    where client_project_id = 48
    group by product_id having count(*) > 1
  ) d;

  select count(*) into unlinked_ops
  from project_operational_items
  where client_project_id = 48 and status <> 'deleted'
    and change_origin = 'quote_seed' and source_quote_item_id is null;

  select count(*) into unlinked_lines
  from project_purchase_lines
  where client_project_id = 48 and quote_item_id is null;

  if op_count <> 14 or line_count <> 14 or dup_products <> 0
     or unlinked_ops <> 0 or unlinked_lines <> 0 then
    raise exception 'Verificacion fallida: partidas=%, lineas=%, productos_duplicados=%, partidas_sin_vinculo=%, lineas_sin_vinculo=%',
      op_count, line_count, dup_products, unlinked_ops, unlinked_lines;
  end if;
end $$;

commit;

-- Post-ejecucion: abrir /projects/48/purchases (dispara el sync) y pulsar
-- "Recalcular lineas desde base operativa" para refrescar costos unitarios y totales.
