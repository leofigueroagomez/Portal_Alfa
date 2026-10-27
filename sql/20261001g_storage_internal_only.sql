-- =============================================================================
-- 20261001g_storage_internal_only.sql
--
-- Cierra storage.objects en produccion (jcdnfjitvyfizcsjvwww): sin acceso anon a
-- buckets privados y escritura solo para usuarios internos.
--
-- Estado: PROPUESTA. NO aplicar en produccion sin confirmacion explicita de Leo.
-- Rollback exacto: sql/20261001g_storage_internal_only_rollback.sql
-- Respaldo previo completo: supabase/backups/storage_policies_20260905.sql
--   (prod 2026-10-01 = ese respaldo menos las 4 "dev product-images" ya borradas;
--    27 policies, hash 7479cbd89b2204393c13c38a4e8551b4).
--
-- PRERREQUISITO DE DESPLIEGUE: el codigo del portal que firma fotos con service
-- role (ctx.db.storage en app/portal/services/[id]/page.tsx, rama
-- claude/kind-greider-86b2f4) debe estar desplegado ANTES. En main el portal
-- todavia firma project-photos con la sesion del cliente/contratista y, sin
-- beta_authenticated_read_storage, las fotos del servicio dejarian de verse.
--
-- Que se quita y por que (inventario de codigo en docs/ai/SECURITY_RULES.md):
--   project-contracts
--     - "Public view ..." (SELECT public) y "Public upload ..." (INSERT public):
--       anon leia/subia INE, firmas y escrituras. Ningun codigo usa este bucket:
--       onboarding/firma/PDF publicos guardan INE y firmas como data URL en
--       project_contracts y leen con service role. 0 objetos en prod.
--     - "Authenticated staff manage ..." (ALL authenticated): incluia portal.
--       Se reemplaza por policies is_internal_user().
--   project-photos / project-documents
--     - "Allow public uploads*" (INSERT anon, authenticated): las firmas publicas
--       (lib/projectDeliverySignature.ts, lib/serviceSignature.ts) suben con
--       service role; ningun flujo sube como anon.
--   project-photos / project-documents / product-images
--     - beta_authenticated_{read,insert,update,delete}_storage: CRUD para
--       cualquier autenticado (portal cliente y contratista). Quedan las
--       alfa_internal_*: current_profile_role() exige is_active AND is_internal,
--       equivalente a is_internal_user(); delete solo admin/direccion.
--   product-images
--     - beta_public_read_product_images: duplicado exacto de
--       alfa_public_read_product_images, que se conserva (catalogo publico,
--       PDFs). Ademas el bucket es public = true: getPublicUrl no pasa por RLS.
--   product_images (bucket heredado, 4 objetos, sin uso en codigo)
--     - "Authenticated uploads/Update Photos/Delete Photos 1uh8lhk_0": escritura
--       para cualquier autenticado. Se conserva "Public product images" (lectura).
--   commercial-partner-assets (bucket public = true)
--     - commercial_partner_assets_select_internal (SELECT public): permitia a anon
--       listar el bucket. Los logos se sirven por getPublicUrl (no usa RLS). Se
--       reemplaza por SELECT is_internal_user() (el upload con upsert lo necesita).
--
-- No se toca: alfa_internal_*, alfa_public_read_product_images, quote_blinds_*,
-- commercial_partner_assets_{insert,update,delete}_internal, buckets.public.
--
-- Idempotente: DROP IF EXISTS + CREATE. Correrla dos veces deja el mismo estado.
-- =============================================================================

begin;

do $guard$
begin
  if to_regprocedure('public.is_internal_user()') is null then
    raise exception 'Falta public.is_internal_user(); abortando.';
  end if;
  if to_regprocedure('public.has_internal_role(text[])') is null then
    raise exception 'Falta public.has_internal_role(text[]); abortando.';
  end if;
end
$guard$;

-- 1. Acceso anon / publico a buckets privados -------------------------------
drop policy if exists "Public view for contract onboarding and signatures" on storage.objects;
drop policy if exists "Public upload for contract onboarding and signatures" on storage.objects;
drop policy if exists "Allow public uploads 1tvgydg_0" on storage.objects;
drop policy if exists "Allow public uploads photos 1pweoxh_0" on storage.objects;

-- 2. CRUD para cualquier autenticado ----------------------------------------
drop policy if exists "Authenticated staff manage project contracts bucket" on storage.objects;
drop policy if exists beta_authenticated_read_storage on storage.objects;
drop policy if exists beta_authenticated_insert_storage on storage.objects;
drop policy if exists beta_authenticated_update_storage on storage.objects;
drop policy if exists beta_authenticated_delete_storage on storage.objects;
drop policy if exists beta_public_read_product_images on storage.objects;

-- 3. Bucket heredado product_images: escritura para cualquier autenticado ----
drop policy if exists "Authenticated uploads 1uh8lhk_0" on storage.objects;
drop policy if exists "Update Photos 1uh8lhk_0" on storage.objects;
drop policy if exists "Delete Photos 1uh8lhk_0" on storage.objects;

-- 4. commercial-partner-assets: listado anon -> solo internos ----------------
drop policy if exists commercial_partner_assets_select_internal on storage.objects;
drop policy if exists commercial_partner_assets_select_internal_only on storage.objects;
create policy commercial_partner_assets_select_internal_only on storage.objects
  as permissive for select to authenticated
  using (bucket_id = 'commercial-partner-assets' and public.is_internal_user());

-- 5. project-contracts: solo internos (mismo patron que alfa_internal_*) ------
drop policy if exists project_contracts_internal_select on storage.objects;
drop policy if exists project_contracts_internal_insert on storage.objects;
drop policy if exists project_contracts_internal_update on storage.objects;
drop policy if exists project_contracts_internal_delete on storage.objects;

create policy project_contracts_internal_select on storage.objects
  as permissive for select to authenticated
  using (bucket_id = 'project-contracts' and public.is_internal_user());

create policy project_contracts_internal_insert on storage.objects
  as permissive for insert to authenticated
  with check (bucket_id = 'project-contracts' and public.is_internal_user());

create policy project_contracts_internal_update on storage.objects
  as permissive for update to authenticated
  using (bucket_id = 'project-contracts' and public.is_internal_user())
  with check (bucket_id = 'project-contracts' and public.is_internal_user());

create policy project_contracts_internal_delete on storage.objects
  as permissive for delete to authenticated
  using (bucket_id = 'project-contracts' and public.has_internal_role(array['admin', 'direccion']));

commit;
