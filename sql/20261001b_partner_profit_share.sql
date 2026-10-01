-- Reparto de utilidad con el aliado (corrige 20261001_quote_line_discounts_brand_rules).
--
-- Leo aclaro (2026-10-01) que el aliado no recibe un % del precio: primero se
-- aplica el descuento al cliente y la utilidad que queda (precio cliente - costo)
-- se reparte, por defecto 50/50, en equipo y en mano de obra. El esquema anterior
-- (15% equipo / 25% mano de obra sobre precio) era la mitad de los margenes
-- normales de ALFA (30% / 50%).
--
-- Aditivo y compatible con el codigo desplegado. Las columnas
-- quote_items.partner_discount_percent y brand_commercial_rules.partner_discount_percent
-- quedan sin uso; se eliminan en 20261001c despues del deploy.

alter table public.quotes
  add column if not exists partner_profit_share_percent numeric(8,4) not null default 50;

alter table public.quotes
  drop constraint if exists quotes_partner_profit_share_percent_range,
  add constraint quotes_partner_profit_share_percent_range
    check (partner_profit_share_percent >= 0 and partner_profit_share_percent <= 100);

alter table public.quote_items
  add column if not exists partner_profit_share_percent numeric(8,4);

alter table public.quote_items
  drop constraint if exists quote_items_partner_profit_share_percent_range,
  add constraint quote_items_partner_profit_share_percent_range
    check (partner_profit_share_percent is null or (partner_profit_share_percent >= 0 and partner_profit_share_percent <= 100));

alter table public.brand_commercial_rules
  add column if not exists partner_profit_share_percent numeric(8,4)
    check (partner_profit_share_percent is null or (partner_profit_share_percent >= 0 and partner_profit_share_percent <= 100));

-- Sonos: sin descuento al cliente; la utilidad (10%) se reparte con el % general
-- de la cotizacion (50/50 -> 5% y 5%).
update public.brand_commercial_rules
set
  partner_profit_share_percent = null,
  notes = 'Margen de canal 10%: sin descuento al cliente, la utilidad se reparte 50/50 con el aliado.',
  updated_at = now()
where lower(btrim(brand)) = 'sonos';

notify pgrst, 'reload schema';
