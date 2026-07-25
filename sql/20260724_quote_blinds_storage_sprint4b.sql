begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'quote-blinds-private',
  'quote-blinds-private',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists quote_blinds_images_select_internal
  on storage.objects;
drop policy if exists quote_blinds_images_insert_commercial_engineering
  on storage.objects;
drop policy if exists quote_blinds_images_update_commercial_engineering
  on storage.objects;
drop policy if exists quote_blinds_images_delete_commercial_engineering
  on storage.objects;

create policy quote_blinds_images_select_internal
on storage.objects
for select
to authenticated
using (
  bucket_id = 'quote-blinds-private'
  and (storage.foldername(name))[1] = 'quote-blinds'
  and public.is_internal_user()
  and exists (
    select 1
    from public.quotes q
    where q.id::text = (storage.foldername(name))[2]
      and q.quote_type = 'blinds'
  )
);

create policy quote_blinds_images_insert_commercial_engineering
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'quote-blinds-private'
  and (storage.foldername(name))[1] = 'quote-blinds'
  and public.has_internal_role(
    array['admin', 'direccion', 'comercial', 'ingenieria']
  )
  and exists (
    select 1
    from public.quote_items qi
    join public.quotes q on q.id = qi.quote_id
    where q.id::text = (storage.foldername(name))[2]
      and qi.id::text = (storage.foldername(name))[3]
      and q.quote_type = 'blinds'
  )
);

create policy quote_blinds_images_update_commercial_engineering
on storage.objects
for update
to authenticated
using (
  bucket_id = 'quote-blinds-private'
  and (storage.foldername(name))[1] = 'quote-blinds'
  and public.has_internal_role(
    array['admin', 'direccion', 'comercial', 'ingenieria']
  )
  and exists (
    select 1
    from public.quote_items qi
    join public.quotes q on q.id = qi.quote_id
    where q.id::text = (storage.foldername(name))[2]
      and qi.id::text = (storage.foldername(name))[3]
      and q.quote_type = 'blinds'
  )
)
with check (
  bucket_id = 'quote-blinds-private'
  and (storage.foldername(name))[1] = 'quote-blinds'
  and public.has_internal_role(
    array['admin', 'direccion', 'comercial', 'ingenieria']
  )
  and exists (
    select 1
    from public.quote_items qi
    join public.quotes q on q.id = qi.quote_id
    where q.id::text = (storage.foldername(name))[2]
      and qi.id::text = (storage.foldername(name))[3]
      and q.quote_type = 'blinds'
  )
);

create policy quote_blinds_images_delete_commercial_engineering
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'quote-blinds-private'
  and (storage.foldername(name))[1] = 'quote-blinds'
  and public.has_internal_role(
    array['admin', 'direccion', 'comercial', 'ingenieria']
  )
  and exists (
    select 1
    from public.quotes q
    where q.id::text = (storage.foldername(name))[2]
      and q.quote_type = 'blinds'
  )
);

comment on column public.quote_blind_item_details.reference_image_path
  is 'Persistent object path in quote-blinds-private using quote-blinds/{quoteId}/{quoteItemId}/...; never store a signed URL.';

commit;
