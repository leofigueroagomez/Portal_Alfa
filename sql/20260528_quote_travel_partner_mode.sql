alter table public.quotes
  add column if not exists includes_travel_expenses_detail boolean not null default false,
  add column if not exists travel_fuel_mxn numeric(14,2) not null default 0,
  add column if not exists travel_tolls_mxn numeric(14,2) not null default 0,
  add column if not exists travel_food_mxn numeric(14,2) not null default 0,
  add column if not exists travel_total_mxn numeric(14,2) not null default 0,
  add column if not exists is_partner_quote boolean not null default false,
  add column if not exists partner_equipment_discount_percent numeric(8,4) not null default 15,
  add column if not exists partner_labor_discount_percent numeric(8,4) not null default 25,
  add column if not exists partner_equipment_discount_mxn numeric(14,2) not null default 0,
  add column if not exists partner_labor_discount_mxn numeric(14,2) not null default 0,
  add column if not exists partner_total_discount_mxn numeric(14,2) not null default 0;

alter table public.products
  add column if not exists partner_discount_eligible boolean not null default true;

update public.quotes
set
  travel_fuel_mxn = coalesce(travel_fuel_mxn, 0),
  travel_tolls_mxn = coalesce(travel_tolls_mxn, 0),
  travel_food_mxn = coalesce(travel_food_mxn, 0),
  travel_total_mxn = coalesce(travel_total_mxn, 0),
  partner_equipment_discount_percent = coalesce(partner_equipment_discount_percent, 15),
  partner_labor_discount_percent = coalesce(partner_labor_discount_percent, 25),
  partner_equipment_discount_mxn = coalesce(partner_equipment_discount_mxn, 0),
  partner_labor_discount_mxn = coalesce(partner_labor_discount_mxn, 0),
  partner_total_discount_mxn = coalesce(partner_total_discount_mxn, 0);

update public.products
set partner_discount_eligible = true
where partner_discount_eligible is null;
