alter table public.products
  add column if not exists fiscal_description text;

alter table public.quote_items
  add column if not exists invoice_description_snapshot text;

create index if not exists products_fiscal_description_idx
  on public.products(id)
  where fiscal_description is not null;
