-- Rollback for 20260824_security_hardening.sql

begin;

-- 1. Restore storage delete policy to allow any authenticated internal role
drop policy if exists "alfa_internal_delete_storage" on storage.objects;

create policy "alfa_internal_delete_storage"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('project-documents', 'project-photos', 'product-images')
  and public.current_profile_role() is not null
);

-- 2. Restore previous commercial_partners policies if needed
-- (Policies remain permissive for internal users)

notify pgrst, 'reload schema';

commit;
