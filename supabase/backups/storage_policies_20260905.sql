-- Respaldo de politicas RLS sobre storage.objects
-- Proyecto: Alfa IT (jcdnfjitvyfizcsjvwww) - PRODUCCION
-- Capturado: 2026-09-05 01:54 UTC, ANTES de aplicar la migracion
--            20260905020000_drop_public_dev_policies_product_images.sql
--
-- Origen:
--   select policyname, permissive, roles, cmd, qual, with_check
--     from pg_policies
--    where schemaname = 'storage' and tablename = 'objects';
--
-- 31 politicas. Este archivo es el estado PREVIO completo: para restaurar
-- cualquiera de ellas basta con ejecutar su CREATE POLICY.
--
-- ROLLBACK de la migracion citada: ejecutar unicamente los cuatro statements
-- marcados abajo con [ELIMINADA POR 20260905020000].

CREATE POLICY "Allow public uploads 1tvgydg_0" ON storage.objects
  AS PERMISSIVE FOR INSERT
  TO anon, authenticated
  WITH CHECK ((bucket_id = 'project-documents'::text));

CREATE POLICY "Allow public uploads photos 1pweoxh_0" ON storage.objects
  AS PERMISSIVE FOR INSERT
  TO anon, authenticated
  WITH CHECK ((bucket_id = 'project-photos'::text));

CREATE POLICY "Authenticated staff manage project contracts bucket" ON storage.objects
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING ((bucket_id = 'project-contracts'::text))
  WITH CHECK ((bucket_id = 'project-contracts'::text));

CREATE POLICY "Authenticated uploads 1uh8lhk_0" ON storage.objects
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'product_images'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Delete Photos 1uh8lhk_0" ON storage.objects
  AS PERMISSIVE FOR DELETE
  TO public
  USING (((bucket_id = 'product_images'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Public product images 1uh8lhk_0" ON storage.objects
  AS PERMISSIVE FOR SELECT
  TO public
  USING ((bucket_id = 'product_images'::text));

CREATE POLICY "Public upload for contract onboarding and signatures" ON storage.objects
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK ((bucket_id = 'project-contracts'::text));

CREATE POLICY "Public view for contract onboarding and signatures" ON storage.objects
  AS PERMISSIVE FOR SELECT
  TO public
  USING ((bucket_id = 'project-contracts'::text));

CREATE POLICY "Update Photos 1uh8lhk_0" ON storage.objects
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (((bucket_id = 'product_images'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY alfa_internal_delete_storage ON storage.objects
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (((bucket_id = ANY (ARRAY['project-documents'::text, 'project-photos'::text, 'product-images'::text])) AND has_internal_role(ARRAY['admin'::text, 'direccion'::text])));

CREATE POLICY alfa_internal_insert_storage ON storage.objects
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = ANY (ARRAY['project-documents'::text, 'project-photos'::text, 'product-images'::text])) AND (current_profile_role() IS NOT NULL)));

CREATE POLICY alfa_internal_read_storage ON storage.objects
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (((bucket_id = ANY (ARRAY['project-documents'::text, 'project-photos'::text, 'product-images'::text])) AND (current_profile_role() IS NOT NULL)));

CREATE POLICY alfa_internal_update_storage ON storage.objects
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (((bucket_id = ANY (ARRAY['project-documents'::text, 'project-photos'::text, 'product-images'::text])) AND (current_profile_role() IS NOT NULL)))
  WITH CHECK (((bucket_id = ANY (ARRAY['project-documents'::text, 'project-photos'::text, 'product-images'::text])) AND (current_profile_role() IS NOT NULL)));

CREATE POLICY alfa_public_read_product_images ON storage.objects
  AS PERMISSIVE FOR SELECT
  TO public
  USING ((bucket_id = 'product-images'::text));

CREATE POLICY beta_authenticated_delete_storage ON storage.objects
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING ((bucket_id = ANY (ARRAY['product-images'::text, 'project-documents'::text, 'project-photos'::text])));

CREATE POLICY beta_authenticated_insert_storage ON storage.objects
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK ((bucket_id = ANY (ARRAY['product-images'::text, 'project-documents'::text, 'project-photos'::text])));

CREATE POLICY beta_authenticated_read_storage ON storage.objects
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING ((bucket_id = ANY (ARRAY['product-images'::text, 'project-documents'::text, 'project-photos'::text])));

CREATE POLICY beta_authenticated_update_storage ON storage.objects
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING ((bucket_id = ANY (ARRAY['product-images'::text, 'project-documents'::text, 'project-photos'::text])))
  WITH CHECK ((bucket_id = ANY (ARRAY['product-images'::text, 'project-documents'::text, 'project-photos'::text])));

CREATE POLICY beta_public_read_product_images ON storage.objects
  AS PERMISSIVE FOR SELECT
  TO anon, authenticated
  USING ((bucket_id = 'product-images'::text));

CREATE POLICY commercial_partner_assets_delete_internal ON storage.objects
  AS PERMISSIVE FOR DELETE
  TO public
  USING (((bucket_id = 'commercial-partner-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'direccion'::text])))))));

CREATE POLICY commercial_partner_assets_insert_internal ON storage.objects
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'commercial-partner-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'direccion'::text, 'comercial'::text, 'sales'::text])))))));

CREATE POLICY commercial_partner_assets_select_internal ON storage.objects
  AS PERMISSIVE FOR SELECT
  TO public
  USING ((bucket_id = 'commercial-partner-assets'::text));

CREATE POLICY commercial_partner_assets_update_internal ON storage.objects
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (((bucket_id = 'commercial-partner-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'direccion'::text, 'comercial'::text, 'sales'::text])))))))
  WITH CHECK (((bucket_id = 'commercial-partner-assets'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'direccion'::text, 'comercial'::text, 'sales'::text])))))));

-- [ELIMINADA POR 20260905020000] rollback: ejecutar este statement
CREATE POLICY "dev product-images delete" ON storage.objects
  AS PERMISSIVE FOR DELETE
  TO public
  USING ((bucket_id = 'product-images'::text));

-- [ELIMINADA POR 20260905020000] rollback: ejecutar este statement
CREATE POLICY "dev product-images insert" ON storage.objects
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK ((bucket_id = 'product-images'::text));

-- [ELIMINADA POR 20260905020000] rollback: ejecutar este statement
CREATE POLICY "dev product-images select" ON storage.objects
  AS PERMISSIVE FOR SELECT
  TO public
  USING ((bucket_id = 'product-images'::text));

-- [ELIMINADA POR 20260905020000] rollback: ejecutar este statement
CREATE POLICY "dev product-images update" ON storage.objects
  AS PERMISSIVE FOR UPDATE
  TO public
  USING ((bucket_id = 'product-images'::text))
  WITH CHECK ((bucket_id = 'product-images'::text));

CREATE POLICY quote_blinds_images_delete_commercial_engineering ON storage.objects
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (((bucket_id = 'quote-blinds-private'::text) AND ((storage.foldername(name))[1] = 'quote-blinds'::text) AND has_internal_role(ARRAY['admin'::text, 'direccion'::text, 'comercial'::text, 'ingenieria'::text]) AND (EXISTS ( SELECT 1
   FROM quotes q
  WHERE (((q.id)::text = (storage.foldername(objects.name))[2]) AND (q.quote_type = 'blinds'::text))))));

CREATE POLICY quote_blinds_images_insert_commercial_engineering ON storage.objects
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'quote-blinds-private'::text) AND ((storage.foldername(name))[1] = 'quote-blinds'::text) AND has_internal_role(ARRAY['admin'::text, 'direccion'::text, 'comercial'::text, 'ingenieria'::text]) AND (EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE (((q.id)::text = (storage.foldername(objects.name))[2]) AND ((qi.id)::text = (storage.foldername(objects.name))[3]) AND (q.quote_type = 'blinds'::text))))));

CREATE POLICY quote_blinds_images_select_internal ON storage.objects
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (((bucket_id = 'quote-blinds-private'::text) AND ((storage.foldername(name))[1] = 'quote-blinds'::text) AND is_internal_user() AND (EXISTS ( SELECT 1
   FROM quotes q
  WHERE (((q.id)::text = (storage.foldername(objects.name))[2]) AND (q.quote_type = 'blinds'::text))))));

CREATE POLICY quote_blinds_images_update_commercial_engineering ON storage.objects
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'quote-blinds-private'::text) AND ((storage.foldername(name))[1] = 'quote-blinds'::text) AND has_internal_role(ARRAY['admin'::text, 'direccion'::text, 'comercial'::text, 'ingenieria'::text]) AND (EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE (((q.id)::text = (storage.foldername(objects.name))[2]) AND ((qi.id)::text = (storage.foldername(objects.name))[3]) AND (q.quote_type = 'blinds'::text))))))
  WITH CHECK (((bucket_id = 'quote-blinds-private'::text) AND ((storage.foldername(name))[1] = 'quote-blinds'::text) AND has_internal_role(ARRAY['admin'::text, 'direccion'::text, 'comercial'::text, 'ingenieria'::text]) AND (EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE (((q.id)::text = (storage.foldername(objects.name))[2]) AND ((qi.id)::text = (storage.foldername(objects.name))[3]) AND (q.quote_type = 'blinds'::text))))));
