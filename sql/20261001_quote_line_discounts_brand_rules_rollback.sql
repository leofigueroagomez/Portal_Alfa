-- Rollback de 20261001_quote_line_discounts_brand_rules.sql.
-- Solo ejecutar si hay que revertir la funcion. Borra los overrides de
-- descuento por partida y las reglas por marca capturadas desde entonces;
-- los totales guardados en public.quotes no se tocan.

alter table public.quote_items
  drop constraint if exists quote_items_client_discount_percent_range,
  drop constraint if exists quote_items_partner_discount_percent_range,
  drop column if exists client_discount_percent,
  drop column if exists partner_discount_percent,
  drop column if exists client_discount_mxn,
  drop column if exists partner_discount_mxn;

drop table if exists public.brand_commercial_rules;

notify pgrst, 'reload schema';
