-- AUTH-01 (auditorias 2026-09-16 y 2026-10-26): alta de perfiles cerrada por defecto.
--
-- Estado: PROPUESTA, NO aplicada en ningun entorno. Aplicar primero en sandbox.
--
-- Problema: handle_new_user_profile() (trigger en auth.users) y
-- ensure_current_user_profile() daban user_type='internal', role='comercial',
-- is_internal=true, is_active=true a cualquier usuario sin metadata de portal
-- cliente. Con el signup publico de Supabase abierto, cualquiera podia crearse
-- una cuenta interna. Ademas los contratistas (metadata user_type
-- 'contractor_portal') caian en la rama interna hasta que el servidor
-- sobrescribia el perfil.
--
-- Cambio: la metadata del usuario nunca otorga acceso interno (en signup
-- publico la controla quien se registra).
--   - metadata client_portal      -> client / client_portal, activo (el acceso
--     real sigue dependiendo de client_portal_users).
--   - metadata contractor_portal  -> contractor / contractor_portal, activo (el
--     acceso real sigue dependiendo de contractor_portal_users).
--   - cualquier otro caso          -> client / client_portal, INACTIVO y no
--     interno. Sin acceso a nada hasta que un admin lo active.
-- El personal interno solo se crea por POST /api/admin/users (service_role),
-- que escribe role, user_type='internal', is_internal=true e is_active de forma
-- explicita. Desplegar ese codigo ANTES de esta migracion.
-- En conflicto (perfil ya existente) nunca se escala: un perfil puede pasar a
-- portal por metadata, jamas a interno.
--
-- Tambien: las funciones de folio (default de columna) ya no se ejecutan como anon.
-- Se conserva authenticated porque los inserts internos con sesion las necesitan.
--
-- Verificacion en sandbox:
--   1. Crear usuario sin metadata -> profiles: role=client, user_type=client_portal,
--      is_internal=false, is_active=false.
--   2. Invitar cliente y contratista desde la app -> entran a su portal.
--   3. Crear interno por /users -> entra a ALFA OS con su rol.
-- Rollback: sql/20261026_profile_bootstrap_deny_by_default_rollback.sql

begin;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta_user_type text;
  next_user_type text;
  next_role text;
  next_is_active boolean;
begin
  meta_user_type := case
    when new.raw_user_meta_data ->> 'user_type' = 'contractor_portal'
      or new.raw_user_meta_data ->> 'portal' = 'contractor'
    then 'contractor_portal'
    when new.raw_user_meta_data ->> 'user_type' = 'client_portal'
      or new.raw_user_meta_data ->> 'portal' = 'client'
      or new.raw_user_meta_data ->> 'role' = 'client'
    then 'client_portal'
    else null
  end;

  next_user_type := coalesce(meta_user_type, 'client_portal');
  next_role := case when next_user_type = 'contractor_portal' then 'contractor' else 'client' end;
  next_is_active := meta_user_type is not null;

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
    false,
    next_is_active
  )
  on conflict (id) do update
  set email = coalesce(public.profiles.email, excluded.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      role = case
        when meta_user_type is not null then excluded.role
        else public.profiles.role
      end,
      user_type = case
        when meta_user_type is not null then excluded.user_type
        else public.profiles.user_type
      end,
      is_internal = case
        when meta_user_type is not null then false
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
  meta_user_type text;
  next_user_type text;
  next_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Si el perfil ya existe no se toca: esta funcion no debe cambiar privilegios.
  select *
  into profile
  from public.profiles
  where id = auth.uid();

  if found then
    return profile;
  end if;

  meta_user_type := case
    when auth.jwt() -> 'user_metadata' ->> 'user_type' = 'contractor_portal'
      or auth.jwt() -> 'user_metadata' ->> 'portal' = 'contractor'
    then 'contractor_portal'
    when auth.jwt() -> 'user_metadata' ->> 'user_type' = 'client_portal'
      or auth.jwt() -> 'user_metadata' ->> 'portal' = 'client'
      or auth.jwt() -> 'user_metadata' ->> 'role' = 'client'
    then 'client_portal'
    else null
  end;

  next_user_type := coalesce(meta_user_type, 'client_portal');
  next_role := case when next_user_type = 'contractor_portal' then 'contractor' else 'client' end;

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
    false,
    meta_user_type is not null
  )
  on conflict (id) do nothing;

  select *
  into profile
  from public.profiles
  where id = auth.uid();

  return profile;
end;
$$;

revoke execute on function public.next_project_invoice_internal_folio() from public, anon;
revoke execute on function public.next_project_profitability_report_number() from public, anon;

-- Advisors de produccion (2026-10-26): estas SECURITY DEFINER se exponian como
-- RPC a anon. El trigger no necesita EXECUTE para dispararse; ensure_* solo
-- tiene sentido con sesion. is_internal_user/has_internal_role/current_profile_role
-- se dejan: devuelven false/null para anon y las usan policies.
revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;
revoke execute on function public.ensure_current_user_profile() from public, anon;

commit;
