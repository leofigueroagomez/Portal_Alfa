create table if not exists public.client_portal_users (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id bigint not null references public.clients(id) on delete cascade,
  is_active boolean not null default true,
  invited_at timestamptz,
  invitation_status text,
  invitation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);

alter table public.client_portal_users
  add column if not exists invited_at timestamptz,
  add column if not exists invitation_status text,
  add column if not exists invitation_error text;

create table if not exists public.client_portal_project_access (
  id bigserial primary key,
  client_portal_user_id bigint not null references public.client_portal_users(id) on delete cascade,
  client_project_id bigint not null references public.client_projects(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_portal_user_id, client_project_id)
);

create index if not exists client_portal_users_user_id_idx
  on public.client_portal_users(user_id);

create index if not exists client_portal_users_client_id_idx
  on public.client_portal_users(client_id);

create index if not exists client_portal_project_access_user_idx
  on public.client_portal_project_access(client_portal_user_id);

create index if not exists client_portal_project_access_project_idx
  on public.client_portal_project_access(client_project_id);

alter table public.client_portal_users enable row level security;
alter table public.client_portal_project_access enable row level security;

drop policy if exists client_portal_users_select_self on public.client_portal_users;
drop policy if exists client_portal_project_access_select_self on public.client_portal_project_access;

create policy client_portal_users_select_self
on public.client_portal_users
for select
to authenticated
using (user_id = auth.uid());

create policy client_portal_project_access_select_self
on public.client_portal_project_access
for select
to authenticated
using (
  exists (
    select 1
    from public.client_portal_users cpu
    where cpu.id = client_portal_project_access.client_portal_user_id
      and cpu.user_id = auth.uid()
      and cpu.is_active = true
  )
);
