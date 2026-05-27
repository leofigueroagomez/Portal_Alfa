-- ALFA OS private beta RLS hardening.
-- Run manually in Supabase SQL Editor. This script does not delete data.

do $$
declare
  table_name text;
  policy_record record;
  protected_tables text[] := array[
    'clients',
    'client_projects',
    'products',
    'product_categories',
    'product_tags',
    'product_tag_assignments',
    'quotes',
    'quote_groups',
    'quote_sections',
    'quote_items',
    'quote_terms_settings',
    'engineering_quotes',
    'projects',
    'documents',
    'project_photos',
    'project_updates',
    'profiles'
  ];
begin
  foreach table_name in array protected_tables loop
    execute format('alter table if exists public.%I enable row level security', table_name);

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and (
          roles && array['public'::name, 'anon'::name]
          or roles is null
        )
        and (
          lower(coalesce(qual, '')) in ('true', '(true)')
          or lower(coalesce(with_check, '')) in ('true', '(true)')
        )
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        table_name
      );
    end loop;

    execute format('drop policy if exists %I on public.%I', 'beta_authenticated_select', table_name);
    execute format('drop policy if exists %I on public.%I', 'beta_authenticated_insert', table_name);
    execute format('drop policy if exists %I on public.%I', 'beta_authenticated_update', table_name);
    execute format('drop policy if exists %I on public.%I', 'beta_authenticated_delete', table_name);

    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      'beta_authenticated_select',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      'beta_authenticated_insert',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      'beta_authenticated_update',
      table_name
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (true)',
      'beta_authenticated_delete',
      table_name
    );
  end loop;
end $$;

-- Storage bucket visibility.
update storage.buckets
set public = true
where id = 'product-images';

update storage.buckets
set public = false
where id in ('project-documents', 'project-photos');

-- Remove clearly open temporary storage policies for these buckets.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        roles && array['public'::name, 'anon'::name]
        or roles is null
      )
      and (
        lower(coalesce(qual, '')) in ('true', '(true)')
        or lower(coalesce(with_check, '')) in ('true', '(true)')
      )
  loop
    execute format('drop policy if exists %I on storage.objects', policy_record.policyname);
  end loop;
end $$;

drop policy if exists "beta_public_read_product_images" on storage.objects;
drop policy if exists "beta_authenticated_read_storage" on storage.objects;
drop policy if exists "beta_authenticated_insert_storage" on storage.objects;
drop policy if exists "beta_authenticated_update_storage" on storage.objects;
drop policy if exists "beta_authenticated_delete_storage" on storage.objects;

create policy "beta_public_read_product_images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

create policy "beta_authenticated_read_storage"
on storage.objects
for select
to authenticated
using (bucket_id in ('product-images', 'project-documents', 'project-photos'));

create policy "beta_authenticated_insert_storage"
on storage.objects
for insert
to authenticated
with check (bucket_id in ('product-images', 'project-documents', 'project-photos'));

create policy "beta_authenticated_update_storage"
on storage.objects
for update
to authenticated
using (bucket_id in ('product-images', 'project-documents', 'project-photos'))
with check (bucket_id in ('product-images', 'project-documents', 'project-photos'));

create policy "beta_authenticated_delete_storage"
on storage.objects
for delete
to authenticated
using (bucket_id in ('product-images', 'project-documents', 'project-photos'));
