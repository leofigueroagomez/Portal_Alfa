-- Security Hardening: Storage delete restrictions & RLS normalization.
-- Review against target environment before applying.

begin;

-- 1. Storage Objects Delete Hardening ----------------------------------------
-- Restrict object deletion in private buckets to admin and direccion only.

drop policy if exists "alfa_internal_delete_storage" on storage.objects;

create policy "alfa_internal_delete_storage"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('project-documents', 'project-photos', 'product-images')
  and public.has_internal_role(array['admin', 'direccion'])
);

-- 2. Commercial Partners RLS Normalization -----------------------------------
-- Ensure is_active = true and is_internal = true checks are strictly enforced.

do $$
begin
  if to_regclass('public.commercial_partners') is not null then
    drop policy if exists commercial_partners_select_internal on public.commercial_partners;
    drop policy if exists commercial_partners_insert_admin_direction_commercial on public.commercial_partners;
    drop policy if exists commercial_partners_update_admin_direction_commercial on public.commercial_partners;
    drop policy if exists commercial_partners_delete_admin_direction on public.commercial_partners;

    create policy commercial_partners_select_internal
    on public.commercial_partners
    for select
    to authenticated
    using (
      public.has_internal_role(array['admin', 'direccion', 'comercial'])
    );

    create policy commercial_partners_insert_admin_direction_commercial
    on public.commercial_partners
    for insert
    to authenticated
    with check (
      public.has_internal_role(array['admin', 'direccion', 'comercial'])
    );

    create policy commercial_partners_update_admin_direction_commercial
    on public.commercial_partners
    for update
    to authenticated
    using (
      public.has_internal_role(array['admin', 'direccion', 'comercial'])
    )
    with check (
      public.has_internal_role(array['admin', 'direccion', 'comercial'])
    );

    create policy commercial_partners_delete_admin_direction
    on public.commercial_partners
    for delete
    to authenticated
    using (
      public.has_internal_role(array['admin', 'direccion'])
    );
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
