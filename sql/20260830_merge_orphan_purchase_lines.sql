-- Fase aparte: lineas de compra huerfanas con historial de compras.
--
-- Contexto: al editar una cotizacion aprobada se borran y recrean sus quote_items; el
-- FK project_operational_items.source_quote_item_id -> quote_items(id) es ON DELETE SET
-- NULL, la partida operativa queda huerfana y la limpieza 20260603 la marca 'deleted'
-- PERO deja viva su linea de compra si ya tenia quantity_purchased > 0. Resultado: una
-- linea huerfana (opitem borrado, con compras) + una linea nueva (opitem activo, vacia)
-- para el mismo producto; la pagina de Compras las consolida por producto y SUMA
-- quantity_required -> cantidad requerida duplicada.
--
-- Este script fusiona los 4 casos SEGUROS (la compra vive solo en la linea huerfana y la
-- linea sana no tiene ningun evento): mueve los eventos a la linea sana, recalcula sus
-- totales con la misma formula que app/api/projects/[id]/purchases/events/[eventId]/route.ts
-- y elimina la linea huerfana.
--
-- Casos fusionados:
--   proyecto 18  linea 328 -> 362 (Epcom TT-101-PV-TURBO, 3 compradas)
--   proyecto 18  linea 330 -> 364 (Linked Pro PRO-CAT-5E-LITE, 1 comprada)
--   proyecto 18  linea 332 -> 366 (Hikvision THC-B127-LMS, 6 compradas)
--   proyecto 35  linea 339 -> 353 (Linked Pro LK712, 2 compradas)
--
-- NO incluido (requiere decision de Leo): proyecto 18 producto DS-1280ZJ-XS, lineas
-- 331 y 365 tienen AMBAS un evento de 6 piezas (posible doble captura durante el
-- rebuild de la cotizacion 57).
--
-- Requisitos: respaldo previo (bkp_20260830_dup_purchase_lines / _events y
-- backups/20260830_purchase_lines_dedup_phase_pre_fix.json).

begin;

-- 0. Salvaguardas: mapa huerfana->sana exacto y sin entregas de material ligadas.
do $$
begin
  if exists (
    select 1 from project_material_delivery_items
    where project_purchase_line_id in (328, 330, 332, 339)
  ) then
    raise exception 'Abortado: hay entregas de material ligadas a una linea huerfana.';
  end if;

  if (select count(*) from project_purchase_events where project_purchase_line_id in (362, 364, 366, 353)) <> 0 then
    raise exception 'Abortado: una linea destino ya tiene eventos; revisar manualmente.';
  end if;

  if (select count(*) from project_purchase_lines
      where id in (362,364,366,353) and project_operational_item_id is not null) <> 4 then
    raise exception 'Abortado: alguna linea destino no existe o perdio su partida operativa.';
  end if;
end $$;

-- 1. Mover los eventos de compra a la linea sana equivalente.
update project_purchase_events set project_purchase_line_id = 362 where project_purchase_line_id = 328;
update project_purchase_events set project_purchase_line_id = 364 where project_purchase_line_id = 330;
update project_purchase_events set project_purchase_line_id = 366 where project_purchase_line_id = 332;
update project_purchase_events set project_purchase_line_id = 353 where project_purchase_line_id = 339;

-- 2. Recalcular las 4 lineas destino desde sus eventos.
with agg as (
  select e.project_purchase_line_id as lid,
         sum(e.quantity) as qty_purchased,
         sum(e.quantity * e.unit_cost) as total_purchased_cost,
         (array_agg(e.supplier) filter (where nullif(btrim(e.supplier), '') is not null))[1] as supplier
  from project_purchase_events e
  where e.project_purchase_line_id in (362, 364, 366, 353)
  group by e.project_purchase_line_id
)
update project_purchase_lines l
set quantity_purchased = agg.qty_purchased,
    total_purchased_cost = agg.total_purchased_cost,
    total_pending_cost = greatest(
      coalesce(l.total_required_cost, 0) - agg.qty_purchased * (
        case when coalesce(l.quantity_required, 0) > 0
             then coalesce(l.total_required_cost, 0) / l.quantity_required
             else coalesce(l.unit_cost, 0) end
      ), 0),
    purchase_status = case
      when agg.qty_purchased <= 0 then 'pending'
      when agg.qty_purchased >= coalesce(l.quantity_required, 0) then 'purchased'
      else 'partial' end,
    supplier = coalesce(agg.supplier, l.supplier),
    updated_at = now()
from agg
where l.id = agg.lid;

-- 3. Eliminar las lineas huerfanas (ya sin eventos).
delete from project_purchase_lines where id in (328, 330, 332, 339);

-- 4. Verificacion.
do $$
declare
  leftover_orphans int;
  dup_18 int;
  dup_35 int;
begin
  select count(*) into leftover_orphans
  from project_purchase_lines l
  left join project_operational_items a on a.id = l.project_operational_item_id
  where l.client_project_id in (18, 35)
    and (l.project_operational_item_id is null or a.status = 'deleted');

  select count(*) into dup_18 from (
    select 1 from project_purchase_lines where client_project_id = 18
    group by product_id having count(*) > 1
  ) d;
  select count(*) into dup_35 from (
    select 1 from project_purchase_lines where client_project_id = 35
    group by product_id having count(*) > 1
  ) d;

  -- proyecto 18 conserva 1 duplicado legitimo pendiente: DS-1280ZJ-XS (331 vs 365)
  --  y 1 duplicado legitimo por traduccion: SX650U (238 vs 241).
  if leftover_orphans <> 1 then
    raise exception 'Verificacion: se esperaba 1 huerfana restante (linea 331), hay %', leftover_orphans;
  end if;
  if dup_18 <> 2 then
    raise exception 'Verificacion proyecto 18: se esperaban 2 grupos duplicados, hay %', dup_18;
  end if;
  if dup_35 <> 0 then
    raise exception 'Verificacion proyecto 35: se esperaban 0 grupos duplicados, hay %', dup_35;
  end if;
end $$;

commit;
