create table if not exists public.commercial_partners (
  id bigserial primary key,
  commercial_name text not null,
  logo_url text,
  logo_storage_path text,
  primary_color text not null default '#9E1B32',
  secondary_color text default '#111111',
  contact_name text,
  contact_email text,
  contact_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_partners_primary_color_hex
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint commercial_partners_secondary_color_hex
    check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$')
);

alter table public.quotes
  add column if not exists commercial_partner_id bigint
    references public.commercial_partners(id) on delete set null;

create index if not exists commercial_partners_active_name_idx
  on public.commercial_partners(is_active, commercial_name);

create index if not exists quotes_commercial_partner_id_idx
  on public.quotes(commercial_partner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'commercial-partner-assets',
  'commercial-partner-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.commercial_partners enable row level security;

drop policy if exists commercial_partners_select_internal on public.commercial_partners;
drop policy if exists commercial_partners_insert_admin_direction_commercial on public.commercial_partners;
drop policy if exists commercial_partners_update_admin_direction_commercial on public.commercial_partners;
drop policy if exists commercial_partners_delete_admin_direction on public.commercial_partners;

create policy commercial_partners_select_internal
on public.commercial_partners
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'direccion', 'comercial', 'sales')
  )
);

create policy commercial_partners_insert_admin_direction_commercial
on public.commercial_partners
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'direccion', 'comercial', 'sales')
  )
);

create policy commercial_partners_update_admin_direction_commercial
on public.commercial_partners
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'direccion', 'comercial', 'sales')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'direccion', 'comercial', 'sales')
  )
);

create policy commercial_partners_delete_admin_direction
on public.commercial_partners
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'direccion')
  )
);

drop policy if exists commercial_partner_assets_select_internal on storage.objects;
drop policy if exists commercial_partner_assets_insert_internal on storage.objects;
drop policy if exists commercial_partner_assets_update_internal on storage.objects;
drop policy if exists commercial_partner_assets_delete_internal on storage.objects;

create policy commercial_partner_assets_select_internal
on storage.objects
for select
using (bucket_id = 'commercial-partner-assets');

create policy commercial_partner_assets_insert_internal
on storage.objects
for insert
with check (
  bucket_id = 'commercial-partner-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'direccion', 'comercial', 'sales')
  )
);

create policy commercial_partner_assets_update_internal
on storage.objects
for update
using (
  bucket_id = 'commercial-partner-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'direccion', 'comercial', 'sales')
  )
)
with check (
  bucket_id = 'commercial-partner-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'direccion', 'comercial', 'sales')
  )
);

create policy commercial_partner_assets_delete_internal
on storage.objects
for delete
using (
  bucket_id = 'commercial-partner-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'direccion')
  )
);
