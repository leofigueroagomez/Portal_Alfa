create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'comercial',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists role text not null default 'comercial',
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set role = case
  when role = 'sales' then 'comercial'
  when role = 'engineering' then 'ingenieria'
  else role
end
where role in ('sales', 'engineering');

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'admin',
    'direccion',
    'comercial',
    'ingenieria',
    'project_manager',
    'instalador',
    'compras',
    'finanzas'
  ));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.email, '')
    ),
    'comercial',
    true
  )
  on conflict (id) do update
  set email = coalesce(public.profiles.email, excluded.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

create or replace function public.ensure_current_user_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    coalesce(
      nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
      nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
      nullif(auth.jwt() ->> 'email', '')
    ),
    'comercial',
    true
  )
  on conflict (id) do update
  set email = coalesce(public.profiles.email, excluded.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      updated_at = now();

  select *
  into profile
  from public.profiles
  where id = auth.uid();

  return profile;
end;
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1
$$;

alter table public.profiles enable row level security;

drop policy if exists beta_authenticated_select on public.profiles;
drop policy if exists beta_authenticated_insert on public.profiles;
drop policy if exists beta_authenticated_update on public.profiles;
drop policy if exists beta_authenticated_delete on public.profiles;

drop policy if exists profiles_select_self_or_admin on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;

create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.current_profile_role() in ('admin', 'direccion')
);

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'comercial'
  and is_active = true
);

create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (public.current_profile_role() in ('admin', 'direccion'))
with check (public.current_profile_role() in ('admin', 'direccion'));

create policy profiles_delete_admin
on public.profiles
for delete
to authenticated
using (public.current_profile_role() in ('admin', 'direccion'));

grant execute on function public.ensure_current_user_profile() to authenticated;
grant execute on function public.current_profile_role() to authenticated;

notify pgrst, 'reload schema';
