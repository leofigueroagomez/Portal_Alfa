-- Limpieza posterior a 20261001b: elimina las columnas del esquema "% del precio
-- para el aliado" por partida y por marca, reemplazadas por
-- partner_profit_share_percent. Aplicar solo cuando el codigo que ya no las usa
-- este desplegado. Nunca se capturaron valores por partida (verificado
-- 2026-10-01: 0 filas con override).

alter table public.quote_items
  drop constraint if exists quote_items_partner_discount_percent_range,
  drop column if exists partner_discount_percent;

alter table public.brand_commercial_rules
  drop column if exists partner_discount_percent;

notify pgrst, 'reload schema';
