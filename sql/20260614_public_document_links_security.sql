-- Sprint 3 security hardening for public document links.
-- Apply only after reviewing production schema. RLS policy changes are not included here.

alter table public.public_document_links
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by_user_id uuid references auth.users(id),
  add column if not exists access_count integer not null default 0,
  add column if not exists last_accessed_at timestamptz;

create index if not exists public_document_links_expires_at_idx
  on public.public_document_links(expires_at);

create index if not exists public_document_links_revoked_at_idx
  on public.public_document_links(revoked_at);

create table if not exists public.public_document_access_events (
  id uuid primary key default gen_random_uuid(),
  public_document_link_id bigint not null references public.public_document_links(id) on delete cascade,
  accessed_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  result text not null,
  request_id text
);

create index if not exists public_document_access_events_link_idx
  on public.public_document_access_events(public_document_link_id, accessed_at desc);

create index if not exists public_document_access_events_result_idx
  on public.public_document_access_events(result, accessed_at desc);

alter table public.public_document_access_events enable row level security;

drop policy if exists public_document_access_events_select_internal
  on public.public_document_access_events;
drop policy if exists public_document_access_events_insert_internal
  on public.public_document_access_events;
drop policy if exists public_document_access_events_update_none
  on public.public_document_access_events;
drop policy if exists public_document_access_events_delete_none
  on public.public_document_access_events;

create policy public_document_access_events_select_internal
on public.public_document_access_events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_internal = true
      and p.is_active = true
  )
);

create policy public_document_access_events_insert_internal
on public.public_document_access_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_internal = true
      and p.is_active = true
  )
);

-- Public route handlers use the service role to write access events. No anon
-- RLS policy is needed for this table.
