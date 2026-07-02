alter table public.quotes
  add column if not exists include_diagnostic_context boolean not null default false;

create table if not exists public.quote_diagnostic_blocks (
  id bigserial primary key,
  quote_id bigint not null references public.quotes(id) on delete cascade,
  title text,
  text text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_diagnostic_blocks_quote_id_sort_idx
  on public.quote_diagnostic_blocks(quote_id, sort_order);

alter table public.quote_diagnostic_blocks enable row level security;

drop policy if exists quote_diagnostic_blocks_select_internal_or_portal_approved on public.quote_diagnostic_blocks;
drop policy if exists quote_diagnostic_blocks_insert_commercial_engineering on public.quote_diagnostic_blocks;
drop policy if exists quote_diagnostic_blocks_update_commercial_engineering on public.quote_diagnostic_blocks;
drop policy if exists quote_diagnostic_blocks_delete_admin_direction on public.quote_diagnostic_blocks;

create policy quote_diagnostic_blocks_select_internal_or_portal_approved
on public.quote_diagnostic_blocks
for select
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quote_diagnostic_blocks_insert_commercial_engineering
on public.quote_diagnostic_blocks
for insert
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quote_diagnostic_blocks_update_commercial_engineering
on public.quote_diagnostic_blocks
for update
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quote_diagnostic_blocks_delete_admin_direction
on public.quote_diagnostic_blocks
for delete
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);
