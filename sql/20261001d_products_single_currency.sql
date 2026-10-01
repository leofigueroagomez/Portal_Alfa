-- Regla de Leo (2026-10-01): un producto maneja una sola moneda. Si el costo
-- esta en MXN el precio de venta esta en MXN; si el costo esta en USD, el precio
-- esta en USD. (En la cotizacion todo se presenta en pesos, pero en catalogo no
-- se mezclan.)
--
-- Origen: los formularios de producto tenian un selector de moneda de venta
-- independiente y la verificacion de costo en cotizaciones cambiaba la moneda
-- del costo sin tocar la del precio. Resultado, por ejemplo: Sonos
-- BM1WMWW1BLK (costo MXN 758) cotizado a USD 947.41 (~MXN 16,500) y Leviton
-- 41644-00W (costo USD 149.71) cotizado a MXN 213.87, vendiendose con perdida.
--
-- 1) Corrige los 4 productos que violaban la regla. En los cuatro el numero del
--    precio sale del costo (costo / (1 - margen)) o es 0, asi que la moneda
--    correcta del precio es la del costo.
-- 2) Agrega un CHECK para que la base de datos rechace mezclas en adelante.

update public.products
set sale_currency = upper(cost_currency)
where id in (167, 193, 239, 409)
  and upper(coalesce(sale_currency, '')) <> upper(coalesce(cost_currency, ''));

alter table public.products
  drop constraint if exists products_sale_currency_matches_cost_currency,
  add constraint products_sale_currency_matches_cost_currency
    check (
      cost_currency is null
      or sale_currency is null
      or upper(sale_currency) = upper(cost_currency)
    );

notify pgrst, 'reload schema';
