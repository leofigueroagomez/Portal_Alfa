-- Rollback de sql/20261026_profile_bootstrap_deny_by_default.sql
-- Restaura exactamente las definiciones de sql/20260604_separate_internal_and_client_portal_users.sql
-- (iguales al baseline remoto 20260702) y el grant de anon en las funciones de folio.

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

grant execute on function public.next_project_invoice_internal_folio() to anon;
grant execute on function public.next_project_profitability_report_number() to anon;
grant execute on function public.handle_new_user_profile() to anon, authenticated;
grant execute on function public.ensure_current_user_profile() to anon;
