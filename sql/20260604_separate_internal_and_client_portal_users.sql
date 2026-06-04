alter table public.profiles
  add column if not exists user_type text not null default 'internal',
  add column if not exists is_internal boolean not null default true;

update public.profiles
set role = case
  when role = 'sales' then 'comercial'
  when role = 'engineering' then 'ingenieria'
  when role = 'tecnico' then 'instalador'
  else role
end
where role in ('sales', 'engineering', 'tecnico');

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
    'finanzas',
    'client'
  ));

alter table public.profiles
  drop constraint if exists profiles_user_type_check;

alter table public.profiles
  add constraint profiles_user_type_check
  check (user_type in ('internal', 'client_portal'));

update public.profiles p
set role = 'client',
    user_type = 'client_portal',
    is_internal = false,
    is_active = true,
    updated_at = now()
where exists (
  select 1
  from public.client_portal_users cpu
  where cpu.user_id = p.id
)
and p.role in (
  'admin',
  'direccion',
  'comercial',
  'ingenieria',
  'project_manager',
  'instalador',
  'compras',
  'finanzas',
  'sales',
  'engineering',
  'tecnico'
);

update public.profiles
set user_type = 'client_portal',
    is_internal = false,
    role = 'client',
    updated_at = now()
where role = 'client';

update public.profiles
set user_type = 'internal',
    is_internal = true,
    updated_at = now()
where role <> 'client'
  and (user_type <> 'internal' or is_internal = false);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  next_user_type text;
  next_is_internal boolean;
  next_role text;
begin
  next_user_type := case
    when new.raw_user_meta_data ->> 'user_type' = 'client_portal'
      or new.raw_user_meta_data ->> 'portal' = 'client'
      or new.raw_user_meta_data ->> 'role' = 'client'
    then 'client_portal'
    else 'internal'
  end;

  next_is_internal := next_user_type = 'internal';
  next_role := case
    when next_user_type = 'client_portal' then 'client'
    else 'comercial'
  end;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    user_type,
    is_internal,
    is_active
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.email, '')
    ),
    next_role,
    next_user_type,
    next_is_internal,
    true
  )
  on conflict (id) do update
  set email = coalesce(public.profiles.email, excluded.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      role = case
        when excluded.user_type = 'client_portal' then 'client'
        else public.profiles.role
      end,
      user_type = case
        when excluded.user_type = 'client_portal' then 'client_portal'
        else public.profiles.user_type
      end,
      is_internal = case
        when excluded.user_type = 'client_portal' then false
        else public.profiles.is_internal
      end,
      updated_at = now();

  return new;
end;
$$;

create or replace function public.ensure_current_user_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile public.profiles;
  jwt_user_type text;
  next_user_type text;
  next_is_internal boolean;
  next_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  jwt_user_type := auth.jwt() -> 'user_metadata' ->> 'user_type';
  next_user_type := case
    when jwt_user_type = 'client_portal'
      or auth.jwt() -> 'user_metadata' ->> 'portal' = 'client'
      or auth.jwt() -> 'user_metadata' ->> 'role' = 'client'
    then 'client_portal'
    else 'internal'
  end;

  next_is_internal := next_user_type = 'internal';
  next_role := case
    when next_user_type = 'client_portal' then 'client'
    else 'comercial'
  end;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    user_type,
    is_internal,
    is_active
  )
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    coalesce(
      nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
      nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
      nullif(auth.jwt() ->> 'email', '')
    ),
    next_role,
    next_user_type,
    next_is_internal,
    true
  )
  on conflict (id) do update
  set email = coalesce(public.profiles.email, excluded.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      role = case
        when excluded.user_type = 'client_portal' then 'client'
        else public.profiles.role
      end,
      user_type = case
        when excluded.user_type = 'client_portal' then 'client_portal'
        else public.profiles.user_type
      end,
      is_internal = case
        when excluded.user_type = 'client_portal' then false
        else public.profiles.is_internal
      end,
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
    and is_internal = true
  limit 1
$$;

drop policy if exists profiles_insert_self on public.profiles;

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and (
    (
      role = 'comercial'
      and user_type = 'internal'
      and is_internal = true
    )
    or (
      role = 'client'
      and user_type = 'client_portal'
      and is_internal = false
    )
  )
  and is_active = true
);

grant execute on function public.ensure_current_user_profile() to authenticated;
grant execute on function public.current_profile_role() to authenticated;

notify pgrst, 'reload schema';
