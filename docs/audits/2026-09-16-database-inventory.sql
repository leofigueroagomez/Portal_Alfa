-- ALFA: inventario de seguridad, preparado 2026-09-16. NO EJECUTADO.
-- Revisar/confirmar proyecto objetivo y ejecutar con acceso administrativo
-- de solo lectura. Produce metadatos; no lee filas de negocio/Auth ni objetos.
-- No contiene migraciones, DML, RPC de aplicacion, SET ROLE ni nextval().
-- Guardar salida local protegida, con fecha/proyecto; no publicar sin revisar.
-- Las policies y nombres de objetos revelan arquitectura aunque no sean PII.

begin transaction read only;
set local statement_timeout = '30s';
set local lock_timeout = '1s';

-- 1. Identidad/version del servidor (no incluye direccion o credenciales).
select current_timestamp as captured_at,
       current_database() as database_name,
       current_user as audit_role,
       current_setting('server_version') as server_version,
       current_setting('transaction_read_only') as transaction_read_only;

-- 2. Todas las tablas/vistas/materializadas de esquemas expuestos conocidos.
-- Confirmar si PostgREST expone esquemas adicionales y ampliar la lista.
select n.nspname as schema_name, c.relname as object_name, c.relkind,
       pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
       c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
  and c.relkind in ('r', 'p', 'v', 'm', 'f')
order by n.nspname, c.relname;

-- 3. Todas las policies, incluyendo PUBLIC y policies RESTRICTIVE.
-- No clasificar como segura una tabla solo porque una policy tenga buen nombre.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 4. Privilegios efectivos; incluyen grants heredados y PUBLIC.
-- SELECT=true no implica filas accesibles: combinar con RLS y pruebas por JWT.
select n.nspname as schema_name, c.relname as object_name, c.relkind,
       r.rolname as role_name,
       has_table_privilege(r.oid, c.oid, 'SELECT') as can_select,
       has_table_privilege(r.oid, c.oid, 'INSERT') as can_insert,
       has_table_privilege(r.oid, c.oid, 'UPDATE') as can_update,
       has_table_privilege(r.oid, c.oid, 'DELETE') as can_delete,
       has_table_privilege(r.oid, c.oid, 'TRUNCATE') as can_truncate
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join pg_roles r
where n.nspname in ('public', 'storage')
  and c.relkind in ('r', 'p', 'v', 'm', 'f')
  and r.rolname in ('anon', 'authenticated', 'service_role')
order by n.nspname, c.relname, r.rolname;

-- 5. Funciones/RPC y privilegios. No ejecutar las funciones inspeccionadas.
-- No exportar prosrc completo: podria contener secretos literales.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as identity_arguments,
       pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer, p.provolatile as volatility,
       p.proconfig as function_settings,
       r.rolname as role_name,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') as can_execute,
       p.prosrc ilike '%raw_user_meta_data%' or p.prosrc ilike '%user_metadata%'
         as mentions_user_metadata,
       p.prosrc ilike '%nextval%' as mentions_sequence_increment,
       p.prosrc ilike '%auth.uid%' as mentions_auth_uid
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and r.rolname in ('anon', 'authenticated', 'service_role')
order by n.nspname, p.proname, identity_arguments, r.rolname;

-- 6. ACL por defecto: tablas/vistas y RPC nuevos no deben abrirse sin revision.
select pg_get_userbyid(d.defaclrole) as owner,
       coalesce(n.nspname, '<all schemas>') as schema_name,
       d.defaclobjtype as object_type,
       case when a.grantee = 0 then 'PUBLIC'
            else pg_get_userbyid(a.grantee) end as grantee,
       a.privilege_type, a.is_grantable
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) a
order by owner, schema_name, object_type, grantee, a.privilege_type;

-- 7. Roles y privilegios de creacion de objetos; sin passwords/rolconfig.
select r.rolname, r.rolsuper, r.rolbypassrls, r.rolcreaterole,
       has_schema_privilege(r.oid, 'public', 'USAGE') as public_usage,
       has_schema_privilege(r.oid, 'public', 'CREATE') as public_create
from pg_roles r
where r.rolname in ('anon', 'authenticated', 'service_role', 'authenticator')
order by r.rolname;

-- 8. Configuracion de buckets. No lista nombres/rutas de archivos.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by id;

-- 9. Columnas que merecen revision de grants/retencion/minimizacion.
-- Solo nombres y tipos; nunca contenido de RFC/INE/tokens/credenciales.
select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name ~* '(token|password|secret|credential|signature|ine_|curp|rfc|clabe|dossier|snapshot|tool_calls|transcript)'
order by table_name, ordinal_position;

-- 10. Triggers de Auth/perfil: identidad, no codigo del trigger.
select n.nspname as schema_name, c.relname as table_name,
       t.tgname as trigger_name, t.tgenabled,
       fn.nspname as function_schema, p.proname as function_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
where not t.tgisinternal
  and ((n.nspname = 'auth' and c.relname = 'users')
       or (n.nspname = 'public' and c.relname = 'profiles'))
order by schema_name, table_name, trigger_name;

rollback;

-- Pendiente fuera de SQL: Auth signup/providers/MFA/password protection,
-- esquemas expuestos, backups/PITR/retencion, copias de objetos Storage,
-- miembros/MFA del Dashboard, alertas y restauracion aislada medida.
