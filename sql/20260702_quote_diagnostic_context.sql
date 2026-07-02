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

drop trigger if exists set_quote_diagnostic_blocks_updated_at on public.quote_diagnostic_blocks;

create trigger set_quote_diagnostic_blocks_updated_at
before update on public.quote_diagnostic_blocks
for each row
execute function public.set_updated_at();

alter table public.quote_diagnostic_blocks enable row level security;

drop policy if exists quote_diagnostic_blocks_select_internal_or_portal_approved on public.quote_diagnostic_blocks;
drop policy if exists quote_diagnostic_blocks_insert_commercial_engineering on public.quote_diagnostic_blocks;
drop policy if exists quote_diagnostic_blocks_update_commercial_engineering on public.quote_diagnostic_blocks;
drop policy if exists quote_diagnostic_blocks_delete_admin_direction on public.quote_diagnostic_blocks;
drop policy if exists beta_authenticated_select on public.quote_diagnostic_blocks;
drop policy if exists beta_authenticated_insert on public.quote_diagnostic_blocks;
drop policy if exists beta_authenticated_update on public.quote_diagnostic_blocks;
drop policy if exists beta_authenticated_delete on public.quote_diagnostic_blocks;

create policy beta_authenticated_select
on public.quote_diagnostic_blocks
for select
to authenticated
using (true);

create policy beta_authenticated_insert
on public.quote_diagnostic_blocks
for insert
to authenticated
with check (true);

create policy beta_authenticated_update
on public.quote_diagnostic_blocks
for update
to authenticated
using (true)
with check (true);

create policy beta_authenticated_delete
on public.quote_diagnostic_blocks
for delete
to authenticated
using (true);

grant all on table public.quote_diagnostic_blocks to anon;
grant all on table public.quote_diagnostic_blocks to authenticated;
grant all on table public.quote_diagnostic_blocks to service_role;

grant all on sequence public.quote_diagnostic_blocks_id_seq to anon;
grant all on sequence public.quote_diagnostic_blocks_id_seq to authenticated;
grant all on sequence public.quote_diagnostic_blocks_id_seq to service_role;

notify pgrst, 'reload schema';
