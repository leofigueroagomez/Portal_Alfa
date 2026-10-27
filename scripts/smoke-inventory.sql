-- Smoke test del modulo de Inventario (sql/20261025_inventory.sql).
--
-- Correr SOLO en sandbox, despues de aplicar la migracion, con un rol que
-- pueda ejecutar las funciones (postgres / service_role):
--
--   psql "$SANDBOX_DB_URL" -v ON_ERROR_STOP=1 -f scripts/smoke-inventory.sql
--
-- Todo corre dentro de una transaccion que termina en ROLLBACK: no deja datos.
-- Crea un producto y una linea de compra de prueba sobre el primer proyecto
-- existente. Si una verificacion falla, aborta con "SMOKE_FAIL: ...".

begin;

do $$
declare
  v_project_id bigint;
  v_product_id bigint;
  v_operational_item_id bigint;
  v_line_id bigint;
  v_item_id bigint;
  v_mov public.inventory_movements;
  v_event public.project_purchase_events;
  v_stock record;
  v_vigia record;
  v_failed boolean;
begin
  select id into v_project_id from public.client_projects order by id limit 1;
  if v_project_id is null then
    raise exception 'SMOKE_FAIL: no hay client_projects para colgar la linea de prueba';
  end if;

  -- products.fiscal_object (default '02') tiene FK a tax_object_catalog; un
  -- sandbox con el catalogo vacio no deja crear productos. Se siembra solo
  -- dentro de esta transaccion (el ROLLBACK final lo quita).
  if to_regclass('public.tax_object_catalog') is not null then
    execute $sql$
      insert into public.tax_object_catalog (code, name)
      select '02', 'Si objeto de impuesto'
      where not exists (select 1 from public.tax_object_catalog where code = '02')
    $sql$;
  end if;

  insert into public.products (brand, model, name, unit_name, cost_price, cost_currency, is_active)
  values ('SMOKE', 'INV-SMOKE-001', 'Producto smoke inventario', 'm', 1, 'USD', false)
  returning id into v_product_id;

  insert into public.project_operational_items (
    client_project_id, product_id, product_brand, product_model, product_name,
    quantity, original_quantity, original_unit_cost, operational_unit_cost,
    cost_currency, exchange_rate
  ) values (
    v_project_id, v_product_id, 'SMOKE', 'INV-SMOKE-001', 'Producto smoke inventario',
    10, 10, 0.5, 0.5, 'USD', 18
  )
  returning id into v_operational_item_id;

  insert into public.project_purchase_lines (
    client_project_id, project_operational_item_id, product_id, product_brand,
    product_model, product_name, quantity_required, quantity_purchased,
    cost_currency, unit_cost, total_required_cost, total_purchased_cost,
    total_pending_cost, purchase_status
  ) values (
    v_project_id, v_operational_item_id, v_product_id, 'SMOKE',
    'INV-SMOKE-001', 'Producto smoke inventario', 10, 0,
    'USD', 0.5, 5, 0, 5, 'pending'
  )
  returning id into v_line_id;

  -- 1. Entrada MXN: 10 @ 5.00 -> saldo 10, promedio 5
  v_mov := public.inventory_register_entry(v_product_id, null, 10, 5, 'MXN', null);
  v_item_id := v_mov.inventory_item_id;
  if v_mov.quantity_after <> 10 or v_mov.average_cost_mxn_after <> 5 or v_mov.total_cost_mxn <> 50 then
    raise exception 'SMOKE_FAIL entrada MXN: %', row_to_json(v_mov);
  end if;

  -- 2. Entrada USD: 10 @ 1 USD, TC 18 -> 18 MXN/u; promedio (50 + 180) / 20 = 11.5
  v_mov := public.inventory_register_entry(v_product_id, 'Almacén principal', 10, 1, 'usd', 18);
  if v_mov.inventory_item_id <> v_item_id or v_mov.unit_cost_mxn <> 18
     or v_mov.quantity_after <> 20 or v_mov.average_cost_mxn_after <> 11.5 then
    raise exception 'SMOKE_FAIL entrada USD: %', row_to_json(v_mov);
  end if;

  -- 3. USD sin tipo de cambio -> rechazo
  v_failed := false;
  begin
    perform public.inventory_register_entry(v_product_id, null, 1, 1, 'USD', null);
  exception when others then
    v_failed := sqlerrm = 'INVENTORY_EXCHANGE_RATE_REQUIRED';
  end;
  if not v_failed then raise exception 'SMOKE_FAIL: USD sin TC no fue rechazado'; end if;

  -- 4. Consumo a proyecto: 4 u -> saldo 16, promedio sin cambio, evento MXN 11.50 recibido
  v_mov := public.inventory_consume_to_project(v_item_id, v_line_id, v_project_id, 4, current_date, 'smoke');
  select * into v_event from public.project_purchase_events where id = v_mov.project_purchase_event_id;
  if v_mov.movement_type <> 'out' or v_mov.quantity_after <> 16 or v_mov.average_cost_mxn_after <> 11.5
     or v_mov.client_project_id <> v_project_id or v_mov.project_purchase_line_id <> v_line_id
     or v_event.id is null or v_event.quantity <> 4 or v_event.unit_cost <> 11.5
     or v_event.cost_currency <> 'MXN' or v_event.warehouse_status <> 'received'
     or v_event.project_purchase_line_id <> v_line_id
     or v_event.invoice_reference <> 'INV-MOV-' || v_mov.id then
    raise exception 'SMOKE_FAIL consumo: mov=% event=%', row_to_json(v_mov), row_to_json(v_event);
  end if;

  -- 5. Vigia ve el evento como costo real en MXN (estimado 0.5 USD * 18 = 9).
  --    Se omite si el entorno no tiene las vistas de Vigia (sandbox atrasado).
  if to_regclass('public.vigia_v_cst01_purchase_overrun') is null then
    raise notice 'SMOKE_SKIP: vigia_v_cst01_purchase_overrun no existe en este entorno';
  else
    execute 'select event_id, real_unit_mxn, est_unit_mxn from public.vigia_v_cst01_purchase_overrun where event_id = $1'
      into v_vigia using v_event.id;
    if v_vigia.event_id is null or v_vigia.real_unit_mxn <> 11.5 or v_vigia.est_unit_mxn <> 9 then
      raise exception 'SMOKE_FAIL vigia_v_cst01: %', row_to_json(v_vigia);
    end if;
  end if;

  -- 6. Consumo mayor a lo pendiente de la linea (pendiente = 10 - 0; la app suma
  --    quantity_purchased despues, aqui sigue en 0) -> 11 excede
  v_failed := false;
  begin
    perform public.inventory_consume_to_project(v_item_id, v_line_id, v_project_id, 11, current_date);
  exception when others then
    v_failed := sqlerrm = 'INVENTORY_EXCEEDS_PENDING';
  end;
  if not v_failed then raise exception 'SMOKE_FAIL: consumo mayor a lo pendiente no fue rechazado'; end if;

  -- 7. Consumo mayor a existencias -> rechazo (simula linea con mas pendiente)
  update public.project_purchase_lines set quantity_required = 100 where id = v_line_id;
  v_failed := false;
  begin
    perform public.inventory_consume_to_project(v_item_id, v_line_id, v_project_id, 17, current_date);
  exception when others then
    v_failed := sqlerrm = 'INVENTORY_INSUFFICIENT_STOCK';
  end;
  if not v_failed then raise exception 'SMOKE_FAIL: consumo sin existencias no fue rechazado'; end if;

  -- 8. Linea de otro proyecto -> rechazo
  v_failed := false;
  begin
    perform public.inventory_consume_to_project(v_item_id, v_line_id, v_project_id + 999999, 1, current_date);
  exception when others then
    v_failed := sqlerrm = 'INVENTORY_LINE_NOT_IN_PROJECT';
  end;
  if not v_failed then raise exception 'SMOKE_FAIL: linea de otro proyecto no fue rechazada'; end if;

  -- 9. Ajuste negativo -6 -> saldo 10; ajuste sin motivo y bajo cero -> rechazo
  v_mov := public.inventory_adjust(v_item_id, -6, null, 'Conteo fisico smoke');
  if v_mov.quantity_after <> 10 or v_mov.average_cost_mxn_after <> 11.5 or v_mov.quantity <> -6 then
    raise exception 'SMOKE_FAIL ajuste: %', row_to_json(v_mov);
  end if;
  v_failed := false;
  begin
    perform public.inventory_adjust(v_item_id, -11, null, 'bajo cero');
  exception when others then
    v_failed := sqlerrm = 'INVENTORY_INSUFFICIENT_STOCK';
  end;
  if not v_failed then raise exception 'SMOKE_FAIL: ajuste bajo cero no fue rechazado'; end if;
  v_failed := false;
  begin
    perform public.inventory_adjust(v_item_id, 1, null, '  ');
  exception when others then
    v_failed := sqlerrm = 'INVENTORY_ADJUST_REASON_REQUIRED';
  end;
  if not v_failed then raise exception 'SMOKE_FAIL: ajuste sin motivo no fue rechazado'; end if;

  -- 10. Vista de existencias y kardex
  select * into v_stock from public.inventory_v_stock where inventory_item_id = v_item_id;
  if v_stock.quantity_available <> 10 or v_stock.stock_value_mxn <> 115 then
    raise exception 'SMOKE_FAIL inventory_v_stock: %', row_to_json(v_stock);
  end if;
  if (select count(*) from public.inventory_movements where inventory_item_id = v_item_id) <> 4 then
    raise exception 'SMOKE_FAIL: el kardex no tiene 4 movimientos';
  end if;

  -- 11. Entrada con evento origen de otro producto -> rechazo
  v_failed := false;
  begin
    perform public.inventory_register_entry(
      v_product_id, null, 1, 1, 'MXN', null,
      (select e.id from public.project_purchase_events e
        join public.project_purchase_lines l on l.id = e.project_purchase_line_id
        where l.product_id is distinct from v_product_id limit 1)
    );
  exception when others then
    v_failed := sqlerrm in ('INVENTORY_SOURCE_EVENT_MISMATCH');
  end;
  if not v_failed and exists (
    select 1 from public.project_purchase_events e
    join public.project_purchase_lines l on l.id = e.project_purchase_line_id
    where l.product_id is distinct from v_product_id
  ) then
    raise exception 'SMOKE_FAIL: evento origen de otro producto no fue rechazado';
  end if;

  raise notice 'SMOKE_OK inventario: entradas, consumo, ajustes, vista y Vigia verificados';
end;
$$;

rollback;
