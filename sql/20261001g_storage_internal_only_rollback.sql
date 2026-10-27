-- =============================================================================
-- 20261001g_storage_internal_only_rollback.sql
--
-- Revierte sql/20261001g_storage_internal_only.sql y deja storage.objects
-- exactamente como estaba en produccion el 2026-10-01 (27 policies,
-- hash 7479cbd89b2204393c13c38a4e8551b4; ver la consulta de hash en
-- docs/ai/SECURITY_RULES.md). Las definiciones salen de
-- supabase/backups/storage_policies_20260905.sql.
--
-- ADVERTENCIA: revertir vuelve a abrir project-contracts a anon (lectura y
-- subida), project-photos/project-documents a subidas anonimas y CRUD de storage
-- a cualquier autenticado. Usar solo como medida temporal.
--
-- Idempotente: DROP IF EXISTS + CREATE.
-- =============================================================================

begin;

-- Quitar lo que crea la migracion
drop policy if exists commercial_partner_assets_select_internal_only on storage.objects;
drop policy if exists project_contracts_internal_select on storage.objects;
drop policy if exists project_contracts_internal_insert on storage.objects;
drop policy if exists project_contracts_internal_update on storage.objects;
drop policy if exists project_contracts_internal_delete on storage.objects;

-- Restaurar las policies de produccion
drop policy if exists "Public view for contract onboarding and signatures" on storage.objects;
create policy "Public view for contract onboarding and signatures" on storage.objects
  as permissive for select to public
  using ((bucket_id = 'project-contracts'::text));

drop policy if exists "Public upload for contract onboarding and signatures" on storage.objects;
create policy "Public upload for contract onboarding and signatures" on storage.objects
  as permissive for insert to public
  with check ((bucket_id = 'project-contracts'::text));

drop policy if exists "Allow public uploads 1tvgydg_0" on storage.objects;
create policy "Allow public uploads 1tvgydg_0" on storage.objects
  as permissive for insert to anon, authenticated
  with check ((bucket_id = 'project-documents'::text));

drop policy if exists "Allow public uploads photos 1pweoxh_0" on storage.objects;
create policy "Allow public uploads photos 1pweoxh_0" on storage.objects
  as permissive for insert to anon, authenticated
  with check ((bucket_id = 'project-photos'::text));

drop policy if exists "Authenticated staff manage project contracts bucket" on storage.objects;
create policy "Authenticated staff manage project contracts bucket" on storage.objects
  as permissive for all to authenticated
  using ((bucket_id = 'project-contracts'::text))
  with check ((bucket_id = 'project-contracts'::text));

drop policy if exists beta_authenticated_read_storage on storage.objects;
create policy beta_authenticated_read_storage on storage.objects
  as permissive for select to authenticated
  using ((bucket_id = any (array['product-images'::text, 'project-documents'::text, 'project-photos'::text])));

drop policy if exists beta_authenticated_insert_storage on storage.objects;
create policy beta_authenticated_insert_storage on storage.objects
  as permissive for insert to authenticated
  with check ((bucket_id = any (array['product-images'::text, 'project-documents'::text, 'project-photos'::text])));

drop policy if exists beta_authenticated_update_storage on storage.objects;
create policy beta_authenticated_update_storage on storage.objects
  as permissive for update to authenticated
  using ((bucket_id = any (array['product-images'::text, 'project-documents'::text, 'project-photos'::text])))
  with check ((bucket_id = any (array['product-images'::text, 'project-documents'::text, 'project-photos'::text])));

drop policy if exists beta_authenticated_delete_storage on storage.objects;
create policy beta_authenticated_delete_storage on storage.objects
  as permissive for delete to authenticated
  using ((bucket_id = any (array['product-images'::text, 'project-documents'::text, 'project-photos'::text])));

drop policy if exists beta_public_read_product_images on storage.objects;
create policy beta_public_read_product_images on storage.objects
  as permissive for select to anon, authenticated
  using ((bucket_id = 'product-images'::text));

drop policy if exists "Authenticated uploads 1uh8lhk_0" on storage.objects;
create policy "Authenticated uploads 1uh8lhk_0" on storage.objects
  as permissive for insert to public
  with check (((bucket_id = 'product_images'::text) and (auth.role() = 'authenticated'::text)));

drop policy if exists "Update Photos 1uh8lhk_0" on storage.objects;
create policy "Update Photos 1uh8lhk_0" on storage.objects
  as permissive for update to public
  using (((bucket_id = 'product_images'::text) and (auth.role() = 'authenticated'::text)));

drop policy if exists "Delete Photos 1uh8lhk_0" on storage.objects;
create policy "Delete Photos 1uh8lhk_0" on storage.objects
  as permissive for delete to public
  using (((bucket_id = 'product_images'::text) and (auth.role() = 'authenticated'::text)));

drop policy if exists commercial_partner_assets_select_internal on storage.objects;
create policy commercial_partner_assets_select_internal on storage.objects
  as permissive for select to public
  using ((bucket_id = 'commercial-partner-assets'::text));

commit;
