alter table public.quote_items
  add column if not exists existing_customer_equipment boolean not null default false,
  add column if not exists area text,
  add column if not exists customer_visible_note text;

comment on column public.quote_items.existing_customer_equipment
  is 'Marks an item as customer-owned/reused equipment; equipment sale price must be zero while labor can still be charged.';

comment on column public.quote_items.area
  is 'Customer-visible installation area or zone for grouping quote items.';

comment on column public.quote_items.customer_visible_note
  is 'Customer-visible note for reused/customer-owned equipment or other line-level context. Must not contain internal costs or margins.';

notify pgrst, 'reload schema';
