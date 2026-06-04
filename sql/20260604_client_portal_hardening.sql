-- Portal Cliente hardening.
-- 1) public_document_links is a token registry. App code creates links with
--    service role after validating portal access; clients must not mutate it.
-- 2) Existing authorized plans stay hidden until ALFA explicitly reviews them.

update public.documents
set is_client_visible = false,
    document_type = coalesce(document_type, type)
where coalesce(document_type, type) = 'authorized_plan'
  and is_client_visible = true;

drop policy if exists beta_authenticated_select on public.public_document_links;
drop policy if exists beta_authenticated_insert on public.public_document_links;
drop policy if exists beta_authenticated_update on public.public_document_links;
drop policy if exists beta_authenticated_delete on public.public_document_links;

drop policy if exists public_document_links_select_internal_or_portal_access
  on public.public_document_links;
drop policy if exists public_document_links_insert_internal
  on public.public_document_links;
drop policy if exists public_document_links_update_internal
  on public.public_document_links;
drop policy if exists public_document_links_delete_internal
  on public.public_document_links;

create policy public_document_links_select_internal_or_portal_access
on public.public_document_links
for select
to authenticated
using (
  public.current_profile_role() is not null
  or exists (
    select 1
    from public.client_portal_users cpu
    join public.client_portal_project_access cppa
      on cppa.client_portal_user_id = cpu.id
    where cpu.user_id = auth.uid()
      and cpu.is_active = true
      and cppa.is_active = true
      and cppa.client_project_id = public_document_links.client_project_id
  )
);

create policy public_document_links_insert_internal
on public.public_document_links
for insert
to authenticated
with check (public.current_profile_role() is not null);

create policy public_document_links_update_internal
on public.public_document_links
for update
to authenticated
using (public.current_profile_role() is not null)
with check (public.current_profile_role() is not null);

create policy public_document_links_delete_internal
on public.public_document_links
for delete
to authenticated
using (public.current_profile_role() is not null);

notify pgrst, 'reload schema';
