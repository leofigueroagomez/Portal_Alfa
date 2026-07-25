begin;

do $$
declare
  object_count bigint := 0;
  referenced_path_count bigint := 0;
begin
  select count(*)
  into object_count
  from storage.objects
  where bucket_id = 'quote-blinds-private';

  if to_regclass('public.quote_blind_item_details') is not null then
    execute $query$
      select count(*)
      from public.quote_blind_item_details
      where reference_image_path is not null
    $query$
    into referenced_path_count;
  end if;

  if object_count > 0 or referenced_path_count > 0 then
    raise exception
      'Rollback aborted: quote-blinds-private has % objects and % persisted image references. Export or migrate real data before retrying.',
      object_count,
      referenced_path_count;
  end if;
end
$$;

drop policy if exists quote_blinds_images_select_internal
  on storage.objects;
drop policy if exists quote_blinds_images_insert_commercial_engineering
  on storage.objects;
drop policy if exists quote_blinds_images_update_commercial_engineering
  on storage.objects;
drop policy if exists quote_blinds_images_delete_commercial_engineering
  on storage.objects;

delete from storage.buckets
where id = 'quote-blinds-private';

comment on column public.quote_blind_item_details.reference_image_path
  is 'Persistent object path under a private Storage bucket, using quote-blinds/{quoteId}/...; never store a signed URL.';

commit;
