alter table if exists public.documents
  add column if not exists is_client_visible boolean not null default false,
  add column if not exists document_type text;

update public.documents
set document_type = coalesce(document_type, type)
where document_type is null;

update public.documents
set is_client_visible = true
where coalesce(document_type, type) = 'authorized_plan';

alter table public.public_document_links
  add column if not exists quote_id bigint references public.quotes(id) on delete cascade,
  add column if not exists document_id bigint references public.documents(id) on delete cascade,
  add column if not exists project_invoice_id bigint references public.project_invoices(id) on delete cascade,
  add column if not exists file_format text;

do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'public.public_document_links'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%document_type%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.public_document_links drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.public_document_links
  add constraint public_document_links_document_type_check
  check (
    document_type in (
      'project_delivery',
      'project_warranty',
      'approved_quote',
      'authorized_plan',
      'project_invoice_pdf',
      'project_invoice_xml'
    )
  );

create index if not exists public_document_links_quote_idx
  on public.public_document_links(quote_id);

create index if not exists public_document_links_document_idx
  on public.public_document_links(document_id);

create index if not exists public_document_links_invoice_idx
  on public.public_document_links(project_invoice_id);

create index if not exists documents_client_visible_idx
  on public.documents(project_id, is_client_visible, document_type);
