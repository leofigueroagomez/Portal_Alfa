-- Cierra un hueco de seguridad en Storage.
--
-- El bucket product-images tenia cuatro politicas RLS heredadas de desarrollo
-- abiertas al rol "public" sin ninguna condicion mas alla del bucket_id. Eso
-- permitia que cualquiera con la anon key del frontend subiera, sobrescribiera
-- o borrara imagenes de productos sin autenticarse.
--
-- Se eliminan solo esas cuatro. La operacion legitima del portal no depende de
-- ellas:
--   * lectura publica de las fotos (cotizaciones y PDFs) la cubren
--     alfa_public_read_product_images y beta_public_read_product_images,
--     ademas de que el bucket esta marcado como public = true;
--   * escritura autenticada la cubren beta_authenticated_insert/update/delete
--     _storage y alfa_internal_insert/update/delete_storage.
--
-- No se toca ninguna otra politica ni ningun otro bucket.

DROP POLICY IF EXISTS "dev product-images select" ON storage.objects;
DROP POLICY IF EXISTS "dev product-images insert" ON storage.objects;
DROP POLICY IF EXISTS "dev product-images update" ON storage.objects;
DROP POLICY IF EXISTS "dev product-images delete" ON storage.objects;

-- ---------------------------------------------------------------------------
-- ROLLBACK
--
-- Respaldo completo del estado previo (las 31 politicas de storage.objects):
--   supabase/backups/storage_policies_20260905.sql
--
-- Para revertir esta migracion, ejecutar:
--
--   CREATE POLICY "dev product-images select" ON storage.objects
--     AS PERMISSIVE FOR SELECT
--     TO public
--     USING ((bucket_id = 'product-images'::text));
--
--   CREATE POLICY "dev product-images insert" ON storage.objects
--     AS PERMISSIVE FOR INSERT
--     TO public
--     WITH CHECK ((bucket_id = 'product-images'::text));
--
--   CREATE POLICY "dev product-images update" ON storage.objects
--     AS PERMISSIVE FOR UPDATE
--     TO public
--     USING ((bucket_id = 'product-images'::text))
--     WITH CHECK ((bucket_id = 'product-images'::text));
--
--   CREATE POLICY "dev product-images delete" ON storage.objects
--     AS PERMISSIVE FOR DELETE
--     TO public
--     USING ((bucket_id = 'product-images'::text));
--
-- Nota: revertir vuelve a abrir el bucket a escritura anonima. Hacerlo solo
-- como medida temporal si se rompe algo, y volver a cerrarlo despues.
-- ---------------------------------------------------------------------------
