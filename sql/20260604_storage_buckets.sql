insert into storage.buckets (id, name, public, file_size_limit)
values
  ('project-documents', 'project-documents', false, 52428800),
  ('project-photos', 'project-photos', false, 52428800),
  ('product-images', 'product-images', true, 10485760)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "alfa_internal_read_storage" on storage.objects;
drop policy if exists "alfa_internal_insert_storage" on storage.objects;
drop policy if exists "alfa_internal_update_storage" on storage.objects;
drop policy if exists "alfa_internal_delete_storage" on storage.objects;
drop policy if exists "alfa_public_read_product_images" on storage.objects;

create policy "alfa_public_read_product_images"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

create policy "alfa_internal_read_storage"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('project-documents', 'project-photos', 'product-images')
  and public.current_profile_role() is not null
);

create policy "alfa_internal_insert_storage"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('project-documents', 'project-photos', 'product-images')
  and public.current_profile_role() is not null
);

create policy "alfa_internal_update_storage"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('project-documents', 'project-photos', 'product-images')
  and public.current_profile_role() is not null
)
with check (
  bucket_id in ('project-documents', 'project-photos', 'product-images')
  and public.current_profile_role() is not null
);

create policy "alfa_internal_delete_storage"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('project-documents', 'project-photos', 'product-images')
  and public.current_profile_role() is not null
);
