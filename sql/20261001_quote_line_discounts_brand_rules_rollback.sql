-- Rollback de 20261001_quote_line_discounts_brand_rules.sql y 20261001b/c.
-- Solo ejecutar si hay que revertir la funcion. Borra los overrides de
-- descuento por partida y las reglas por marca capturadas desde entonces;
-- los totales guardados en public.quotes no se tocan.

alter table public.quote_items
  drop constraint if exists quote_items_client_discount_percent_range,
  drop constraint if exists quote_items_partner_discount_percent_range,
  drop column if exists client_discount_percent,
  drop column if exists partner_discount_percent,
  drop column if exists client_discount_mxn,
  drop column if exists partner_discount_mxn,
  drop constraint if exists quote_items_partner_profit_share_percent_range,
  drop column if exists partner_profit_share_percent;

alter table public.quotes
  drop constraint if exists quotes_partner_profit_share_percent_range,
  drop column if exists partner_profit_share_percent;

drop table if exists public.brand_commercial_rules;

notify pgrst, 'reload schema';
