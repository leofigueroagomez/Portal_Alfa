-- Sprint 4: critical RLS hardening for ALFA OS.
-- Review against a real pg_policies dump before applying in production.
-- Scope: critical group only. This intentionally does not touch storage policies
-- or the remaining beta_authenticated_* tables.

begin;

-- Helper functions ---------------------------------------------------------
-- These functions are SECURITY DEFINER so policies can check the current
-- profile/portal access without recursively depending on the same table RLS.

do $$
begin
  if to_regprocedure('public.is_internal_user()') is null then
    execute $fn$
      create function public.is_internal_user()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_active = true
            and p.is_internal = true
        )
      $body$
    $fn$;
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.has_internal_role(text[])') is null then
    execute $fn$
      create function public.has_internal_role(allowed_roles text[])
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_active = true
            and p.is_internal = true
            and p.role = any(allowed_roles)
        )
      $body$
    $fn$;
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.has_project_portal_access(bigint)') is null then
    execute $fn$
      create function public.has_project_portal_access(project_id bigint)
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.client_portal_users cpu
          join public.client_portal_project_access cppa
            on cppa.client_portal_user_id = cpu.id
          where cpu.user_id = auth.uid()
            and cpu.is_active = true
            and cppa.is_active = true
            and cppa.client_project_id = project_id
        )
      $body$
    $fn$;
  end if;
end $$;

grant execute on function public.is_internal_user() to authenticated;
grant execute on function public.has_internal_role(text[]) to authenticated;
grant execute on function public.has_project_portal_access(bigint) to authenticated;

-- Shared cleanup -----------------------------------------------------------

do $$
declare
  table_name text;
  policy_name text;
  open_policy record;
  critical_tables text[] := array[
    'profiles',
    'clients',
    'client_projects',
    'projects',
    'quotes',
    'quote_groups',
    'quote_sections',
    'quote_items',
    'project_invoices',
    'project_invoice_items',
    'project_payment_complements',
    'project_payments',
    'project_payment_audit_log',
    'public_document_links'
  ];
  beta_policies text[] := array[
    'beta_authenticated_select',
    'beta_authenticated_insert',
    'beta_authenticated_update',
    'beta_authenticated_delete'
  ];
begin
  foreach table_name in array critical_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);

      foreach policy_name in array beta_policies loop
        execute format('drop policy if exists %I on public.%I', policy_name, table_name);
      end loop;

      for open_policy in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = table_name
          and roles::text ilike '%authenticated%'
          and (
            lower(coalesce(qual, '')) in ('true', '(true)')
            or lower(coalesce(with_check, '')) in ('true', '(true)')
          )
      loop
        execute format(
          'drop policy if exists %I on public.%I',
          open_policy.policyname,
          table_name
        );
      end loop;
    end if;
  end loop;
end $$;

-- profiles -----------------------------------------------------------------

drop policy if exists profiles_select_self_or_admin on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;
drop policy if exists profiles_select_self_or_internal_admin on public.profiles;
drop policy if exists profiles_insert_self_bootstrap on public.profiles;
drop policy if exists profiles_update_internal_admin on public.profiles;
drop policy if exists profiles_delete_internal_admin on public.profiles;

create policy profiles_select_self_or_internal_admin
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or (
    public.is_internal_user()
    and profiles.is_internal = true
  )
);

create policy profiles_insert_self_bootstrap
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and is_active = true
  and (
    (
      role = 'client'
      and user_type = 'client_portal'
      and is_internal = false
    )
    or (
      role = 'comercial'
      and user_type = 'internal'
      and is_internal = true
    )
  )
);

create policy profiles_update_internal_admin
on public.profiles
for update
to authenticated
using (public.has_internal_role(array['admin', 'direccion']))
with check (public.has_internal_role(array['admin', 'direccion']));

create policy profiles_delete_internal_admin
on public.profiles
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion']));

-- clients ------------------------------------------------------------------

drop policy if exists clients_select_internal_or_portal_self on public.clients;
drop policy if exists clients_insert_commercial on public.clients;
drop policy if exists clients_update_commercial_finance on public.clients;
drop policy if exists clients_delete_admin_direction on public.clients;

create policy clients_select_internal_or_portal_self
on public.clients
for select
to authenticated
using (
  public.is_internal_user()
  or exists (
    select 1
    from public.client_portal_users cpu
    where cpu.user_id = auth.uid()
      and cpu.is_active = true
      and cpu.client_id = clients.id
  )
);

create policy clients_insert_commercial
on public.clients
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial'])
);

create policy clients_update_commercial_finance
on public.clients
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'finanzas'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'finanzas'])
);

create policy clients_delete_admin_direction
on public.clients
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion']));

-- client_projects ----------------------------------------------------------

drop policy if exists client_projects_select_internal_or_portal_access on public.client_projects;
drop policy if exists client_projects_insert_commercial on public.client_projects;
drop policy if exists client_projects_update_internal_authorized on public.client_projects;
drop policy if exists client_projects_delete_admin_direction on public.client_projects;

create policy client_projects_select_internal_or_portal_access
on public.client_projects
for select
to authenticated
using (
  public.is_internal_user()
  or public.has_project_portal_access(client_projects.id)
);

create policy client_projects_insert_commercial
on public.client_projects
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'project_manager'])
);

create policy client_projects_update_internal_authorized
on public.client_projects
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'project_manager', 'ingenieria'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'project_manager', 'ingenieria'])
);

create policy client_projects_delete_admin_direction
on public.client_projects
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion']));

-- projects -----------------------------------------------------------------
-- Legacy table. Only create policies when the table exists. If it has a
-- client_project_id column, portal access can be scoped; otherwise internal-only.

do $$
begin
  if to_regclass('public.projects') is not null then
    execute 'drop policy if exists projects_select_internal_or_portal_access on public.projects';
    execute 'drop policy if exists projects_insert_internal_authorized on public.projects';
    execute 'drop policy if exists projects_update_internal_authorized on public.projects';
    execute 'drop policy if exists projects_delete_admin_direction on public.projects';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'projects'
        and column_name = 'client_project_id'
    ) then
      execute $policy$
        create policy projects_select_internal_or_portal_access
        on public.projects
        for select
        to authenticated
        using (
          public.is_internal_user()
          or public.has_project_portal_access(projects.client_project_id)
        )
      $policy$;
    else
      execute $policy$
        create policy projects_select_internal_or_portal_access
        on public.projects
        for select
        to authenticated
        using (public.is_internal_user())
      $policy$;
    end if;

    execute $policy$
      create policy projects_insert_internal_authorized
      on public.projects
      for insert
      to authenticated
      with check (
        public.has_internal_role(array['admin', 'direccion', 'comercial', 'project_manager'])
      )
    $policy$;

    execute $policy$
      create policy projects_update_internal_authorized
      on public.projects
      for update
      to authenticated
      using (
        public.has_internal_role(array['admin', 'direccion', 'comercial', 'project_manager', 'ingenieria'])
      )
      with check (
        public.has_internal_role(array['admin', 'direccion', 'comercial', 'project_manager', 'ingenieria'])
      )
    $policy$;

    execute $policy$
      create policy projects_delete_admin_direction
      on public.projects
      for delete
      to authenticated
      using (public.has_internal_role(array['admin', 'direccion']))
    $policy$;
  end if;
end $$;

-- quotes and quote children ------------------------------------------------

drop policy if exists quotes_select_internal_or_portal_approved on public.quotes;
drop policy if exists quotes_insert_commercial_engineering on public.quotes;
drop policy if exists quotes_update_commercial_engineering on public.quotes;
drop policy if exists quotes_delete_admin_direction on public.quotes;

create policy quotes_select_internal_or_portal_approved
on public.quotes
for select
to authenticated
using (
  public.is_internal_user()
  or (
    status = 'approved'
    and public.has_project_portal_access(quotes.client_project_id)
  )
);

create policy quotes_insert_commercial_engineering
on public.quotes
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quotes_update_commercial_engineering
on public.quotes
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quotes_delete_admin_direction
on public.quotes
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion']));

-- project_manager remains SELECT-only for quotes in this hardening pass.
-- Current quote permission helpers do not clearly authorize project_manager edits.

drop policy if exists quote_groups_select_internal_or_portal_approved on public.quote_groups;
drop policy if exists quote_groups_insert_commercial_engineering on public.quote_groups;
drop policy if exists quote_groups_update_commercial_engineering on public.quote_groups;
drop policy if exists quote_groups_delete_admin_direction on public.quote_groups;

create policy quote_groups_select_internal_or_portal_approved
on public.quote_groups
for select
to authenticated
using (
  public.is_internal_user()
  or exists (
    select 1
    from public.quotes q
    where q.id = quote_groups.approved_quote_id
      and q.status = 'approved'
      and public.has_project_portal_access(q.client_project_id)
  )
);

create policy quote_groups_insert_commercial_engineering
on public.quote_groups
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quote_groups_update_commercial_engineering
on public.quote_groups
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quote_groups_delete_admin_direction
on public.quote_groups
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion']));

drop policy if exists quote_sections_select_internal_or_portal_approved on public.quote_sections;
drop policy if exists quote_sections_insert_commercial_engineering on public.quote_sections;
drop policy if exists quote_sections_update_commercial_engineering on public.quote_sections;
drop policy if exists quote_sections_delete_admin_direction on public.quote_sections;

create policy quote_sections_select_internal_or_portal_approved
on public.quote_sections
for select
to authenticated
using (
  public.is_internal_user()
  or exists (
    select 1
    from public.quotes q
    where q.id = quote_sections.quote_id
      and q.status = 'approved'
      and public.has_project_portal_access(q.client_project_id)
  )
);

create policy quote_sections_insert_commercial_engineering
on public.quote_sections
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quote_sections_update_commercial_engineering
on public.quote_sections
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quote_sections_delete_admin_direction
on public.quote_sections
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion']));

drop policy if exists quote_items_select_internal_or_portal_approved on public.quote_items;
drop policy if exists quote_items_insert_commercial_engineering on public.quote_items;
drop policy if exists quote_items_update_commercial_engineering on public.quote_items;
drop policy if exists quote_items_delete_admin_direction on public.quote_items;

create policy quote_items_select_internal_or_portal_approved
on public.quote_items
for select
to authenticated
using (
  public.is_internal_user()
  or exists (
    select 1
    from public.quotes q
    where q.id = quote_items.quote_id
      and q.status = 'approved'
      and public.has_project_portal_access(q.client_project_id)
  )
);

create policy quote_items_insert_commercial_engineering
on public.quote_items
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quote_items_update_commercial_engineering
on public.quote_items
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
);

create policy quote_items_delete_admin_direction
on public.quote_items
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion']));

-- financial and fiscal tables ---------------------------------------------

drop policy if exists project_invoices_select_finance_or_portal_project on public.project_invoices;
drop policy if exists project_invoices_select_internal_or_portal_project on public.project_invoices;
drop policy if exists project_invoices_insert_finance on public.project_invoices;
drop policy if exists project_invoices_update_finance on public.project_invoices;
drop policy if exists project_invoices_delete_finance_admin on public.project_invoices;

create policy project_invoices_select_internal_or_portal_project
on public.project_invoices
for select
to authenticated
using (
  public.is_internal_user()
  or (
    status in ('issued', 'paid')
    and public.has_project_portal_access(project_invoices.client_project_id)
  )
);

create policy project_invoices_insert_finance
on public.project_invoices
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
);

create policy project_invoices_update_finance
on public.project_invoices
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
);

create policy project_invoices_delete_finance_admin
on public.project_invoices
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion', 'finanzas']));

drop policy if exists project_invoice_items_select_finance_or_portal_project on public.project_invoice_items;
drop policy if exists project_invoice_items_select_internal_or_portal_project on public.project_invoice_items;
drop policy if exists project_invoice_items_insert_finance on public.project_invoice_items;
drop policy if exists project_invoice_items_update_finance on public.project_invoice_items;
drop policy if exists project_invoice_items_delete_finance_admin on public.project_invoice_items;

create policy project_invoice_items_select_internal_or_portal_project
on public.project_invoice_items
for select
to authenticated
using (
  public.is_internal_user()
  or exists (
    select 1
    from public.project_invoices pi
    where pi.id = project_invoice_items.project_invoice_id
      and pi.status in ('issued', 'paid')
      and public.has_project_portal_access(pi.client_project_id)
  )
);

create policy project_invoice_items_insert_finance
on public.project_invoice_items
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
);

create policy project_invoice_items_update_finance
on public.project_invoice_items
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
);

create policy project_invoice_items_delete_finance_admin
on public.project_invoice_items
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion', 'finanzas']));

drop policy if exists project_payment_complements_select_finance_or_portal_project on public.project_payment_complements;
drop policy if exists project_payment_complements_select_internal_or_portal_project on public.project_payment_complements;
drop policy if exists project_payment_complements_insert_finance on public.project_payment_complements;
drop policy if exists project_payment_complements_update_finance on public.project_payment_complements;
drop policy if exists project_payment_complements_delete_finance_admin on public.project_payment_complements;

create policy project_payment_complements_select_internal_or_portal_project
on public.project_payment_complements
for select
to authenticated
using (
  public.is_internal_user()
  or (
    status in ('issued', 'stamped')
    and public.has_project_portal_access(project_payment_complements.client_project_id)
  )
);

create policy project_payment_complements_insert_finance
on public.project_payment_complements
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
);

create policy project_payment_complements_update_finance
on public.project_payment_complements
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
);

create policy project_payment_complements_delete_finance_admin
on public.project_payment_complements
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion', 'finanzas']));

drop policy if exists project_payments_select_finance_or_portal_project on public.project_payments;
drop policy if exists project_payments_select_internal_or_portal_project on public.project_payments;
drop policy if exists project_payments_insert_finance on public.project_payments;
drop policy if exists project_payments_update_finance on public.project_payments;
drop policy if exists project_payments_delete_finance_admin on public.project_payments;

create policy project_payments_select_internal_or_portal_project
on public.project_payments
for select
to authenticated
using (
  public.is_internal_user()
  or public.has_project_portal_access(project_payments.client_project_id)
);

create policy project_payments_insert_finance
on public.project_payments
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
);

create policy project_payments_update_finance
on public.project_payments
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
);

create policy project_payments_delete_finance_admin
on public.project_payments
for delete
to authenticated
using (public.has_internal_role(array['admin', 'direccion', 'finanzas']));

drop policy if exists project_payment_audit_log_select_finance on public.project_payment_audit_log;
drop policy if exists project_payment_audit_log_insert_finance on public.project_payment_audit_log;
drop policy if exists project_payment_audit_log_update_none on public.project_payment_audit_log;
drop policy if exists project_payment_audit_log_delete_none on public.project_payment_audit_log;

create policy project_payment_audit_log_select_finance
on public.project_payment_audit_log
for select
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
);

create policy project_payment_audit_log_insert_finance
on public.project_payment_audit_log
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'finanzas'])
);

-- No update/delete policies for project_payment_audit_log. The service role
-- still bypasses RLS for backend maintenance when needed.

-- public_document_links ----------------------------------------------------

drop policy if exists public_document_links_select_internal_or_portal_access
  on public.public_document_links;
drop policy if exists public_document_links_select_internal_authorized
  on public.public_document_links;
drop policy if exists public_document_links_insert_internal
  on public.public_document_links;
drop policy if exists public_document_links_update_internal
  on public.public_document_links;
drop policy if exists public_document_links_delete_internal
  on public.public_document_links;

create policy public_document_links_select_internal_authorized
on public.public_document_links
for select
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'finanzas', 'project_manager'])
);

create policy public_document_links_insert_internal
on public.public_document_links
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'finanzas', 'project_manager'])
);

create policy public_document_links_update_internal
on public.public_document_links
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'finanzas', 'project_manager'])
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'finanzas', 'project_manager'])
);

create policy public_document_links_delete_internal
on public.public_document_links
for delete
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'finanzas', 'project_manager'])
);

notify pgrst, 'reload schema';

commit;

-- Manual rollback notes:
-- 1) Drop policies named in this file.
-- 2) Recreate the prior beta policies only if an emergency rollback is needed.
-- 3) Do not drop helper functions until every policy depending on them is removed.
