-- Semilla opcional del inventario (2026-10-25). Requiere sql/20261025_inventory.sql.
--
-- Caso Genki Poke (proyecto 25): se compro una bobina de 305 m de
-- LP218-FIRE-M (producto 229) a Adises, factura WEB-612566, $2,045.50 MXN
-- (evento de compra 123). Al proyecto se le cargaron 50 m a $6.71; los 255 m
-- restantes quedan en almacen a $6.7066 MXN/m (2,045.50 / 305).
--
-- No modifica el evento 123 ni la linea 444: el costo del proyecto queda igual.
-- Idempotente: solo inserta si no existe ya una entrada con origen en el evento 123.

do $$
declare
  v_adises_id bigint;
begin
  if exists (
    select 1 from public.inventory_movements
    where source_purchase_event_id = 123 and movement_type = 'in'
  ) then
    raise notice 'Semilla Genki Poke ya aplicada; sin cambios.';
    return;
  end if;

  if not exists (
    select 1
    from public.project_purchase_events e
    join public.project_purchase_lines l on l.id = e.project_purchase_line_id
    where e.id = 123 and l.product_id = 229 and l.client_project_id = 25
  ) then
    raise notice 'Evento 123 / producto 229 / proyecto 25 no existen en este entorno; semilla omitida.';
    return;
  end if;

  select id into v_adises_id
  from public.suppliers
  where name ilike 'Adises'
  order by id
  limit 1;

  perform public.inventory_register_entry(
    p_product_id => 229,
    p_location => 'Almacén principal',
    p_quantity => 255,
    p_unit_cost => 6.7066,
    p_cost_currency => 'MXN',
    p_exchange_rate => null,
    p_source_purchase_event_id => 123,
    p_supplier_id => v_adises_id,
    p_invoice_reference => 'WEB-612566',
    p_notes => 'Sobrante de bobina 305 m comprada para Genki Poke (P25). 50 m cargados al proyecto; 255 m a almacén.',
    p_created_by_user_id => null
  );
end;
$$;
