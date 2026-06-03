alter table public.clients
  add column if not exists tax_rfc text,
  add column if not exists tax_business_name text,
  add column if not exists tax_regime text,
  add column if not exists default_cfdi_use text,
  add column if not exists fiscal_regime text,
  add column if not exists cfdi_use text,
  add column if not exists tax_zip_code text,
  add column if not exists billing_email text;

alter table public.products
  add column if not exists sat_product_service_code text,
  add column if not exists sat_unit_code text,
  add column if not exists sat_unit_name text,
  add column if not exists fiscal_object text not null default '02';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'sat_product_key'
  ) then
    execute 'update public.products set sat_product_service_code = coalesce(sat_product_service_code, nullif(sat_product_key, ''''))';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'sat_unit_key'
  ) then
    execute 'update public.products set sat_unit_code = coalesce(sat_unit_code, nullif(sat_unit_key, ''''))';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'unit_name'
  ) then
    execute 'update public.products set sat_unit_name = coalesce(sat_unit_name, nullif(unit_name, ''''))';
  end if;

  update public.products
  set fiscal_object = coalesce(nullif(fiscal_object, ''), '02');
end $$;

create table if not exists public.sat_product_service_catalog (
  code text primary key,
  description text not null,
  is_active boolean not null default true
);

create table if not exists public.sat_unit_catalog (
  code text primary key,
  name text not null,
  description text,
  is_active boolean not null default true
);

insert into public.sat_product_service_catalog (code, description, is_active)
values
  ('43211500', 'Computadoras', true),
  ('43221700', 'Equipo fijo y componentes de red', true),
  ('45111600', 'Proyectores y suministros', true),
  ('52161500', 'Equipos audiovisuales', true),
  ('81161700', 'Servicios de telecomunicaciones', true)
on conflict (code) do update
set
  description = excluded.description,
  is_active = excluded.is_active;

insert into public.sat_unit_catalog (code, name, description, is_active)
values
  ('E48', 'Unidad de servicio', 'Unidad de servicio', true),
  ('H87', 'Pieza', 'Pieza', true),
  ('ACT', 'Actividad', 'Actividad', true),
  ('E51', 'Trabajo', 'Trabajo', true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;

update public.products p
set sat_product_service_code = null
where sat_product_service_code is not null
  and not exists (
    select 1
    from public.sat_product_service_catalog spsc
    where spsc.code = p.sat_product_service_code
  );

update public.products p
set sat_unit_code = null
where sat_unit_code is not null
  and not exists (
    select 1
    from public.sat_unit_catalog suc
    where suc.code = p.sat_unit_code
  );

update public.products p
set sat_unit_name = coalesce(nullif(p.sat_unit_name, ''), suc.name)
from public.sat_unit_catalog suc
where p.sat_unit_code = suc.code;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_sat_product_service_code_fkey'
  ) then
    alter table public.products
      add constraint products_sat_product_service_code_fkey
      foreign key (sat_product_service_code)
      references public.sat_product_service_catalog(code);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_sat_unit_code_fkey'
  ) then
    alter table public.products
      add constraint products_sat_unit_code_fkey
      foreign key (sat_unit_code)
      references public.sat_unit_catalog(code);
  end if;
end $$;

alter table public.sat_product_service_catalog enable row level security;
alter table public.sat_unit_catalog enable row level security;

drop policy if exists beta_authenticated_select on public.sat_product_service_catalog;
drop policy if exists beta_authenticated_select on public.sat_unit_catalog;

create policy beta_authenticated_select
on public.sat_product_service_catalog
for select
to authenticated
using (true);

create policy beta_authenticated_select
on public.sat_unit_catalog
for select
to authenticated
using (true);

create table if not exists public.fiscal_regime_catalog (
  code text primary key,
  name text not null,
  applies_to_person_type text not null check (applies_to_person_type in ('physical', 'moral', 'both')),
  is_active boolean not null default true
);

create table if not exists public.cfdi_use_catalog (
  code text primary key,
  name text not null,
  applies_to_person_type text not null check (applies_to_person_type in ('physical', 'moral', 'both')),
  is_active boolean not null default true
);

insert into public.fiscal_regime_catalog (code, name, applies_to_person_type, is_active)
values
  ('601', 'General de Ley Personas Morales', 'moral', true),
  ('603', 'Personas Morales con Fines no Lucrativos', 'moral', true),
  ('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', 'physical', true),
  ('612', 'Personas Fisicas con Actividades Empresariales y Profesionales', 'physical', true),
  ('626', 'Regimen Simplificado de Confianza', 'both', true)
on conflict (code) do update
set
  name = excluded.name,
  applies_to_person_type = excluded.applies_to_person_type,
  is_active = excluded.is_active;

insert into public.cfdi_use_catalog (code, name, applies_to_person_type, is_active)
values
  ('G01', 'Adquisicion de mercancias', 'both', true),
  ('G03', 'Gastos en general', 'both', true),
  ('I04', 'Equipo de computo y accesorios', 'both', true),
  ('S01', 'Sin efectos fiscales', 'both', true)
on conflict (code) do update
set
  name = excluded.name,
  applies_to_person_type = excluded.applies_to_person_type,
  is_active = excluded.is_active;

update public.clients c
set fiscal_regime = frc.code
from public.fiscal_regime_catalog frc
where c.fiscal_regime is null
  and (
    upper(trim(c.tax_regime)) = upper(frc.code)
    or upper(trim(c.tax_regime)) = upper(frc.name)
    or upper(trim(c.tax_regime)) = upper(frc.code || ' - ' || frc.name)
  );

update public.clients c
set cfdi_use = cuc.code
from public.cfdi_use_catalog cuc
where c.cfdi_use is null
  and (
    upper(trim(c.default_cfdi_use)) = upper(cuc.code)
    or upper(trim(c.default_cfdi_use)) = upper(cuc.name)
    or upper(trim(c.default_cfdi_use)) = upper(cuc.code || ' - ' || cuc.name)
  );

update public.clients
set
  tax_regime = coalesce(tax_regime, fiscal_regime),
  default_cfdi_use = coalesce(default_cfdi_use, cfdi_use)
where fiscal_regime is not null
   or cfdi_use is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_fiscal_regime_fkey'
  ) then
    alter table public.clients
      add constraint clients_fiscal_regime_fkey
      foreign key (fiscal_regime)
      references public.fiscal_regime_catalog(code);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_cfdi_use_fkey'
  ) then
    alter table public.clients
      add constraint clients_cfdi_use_fkey
      foreign key (cfdi_use)
      references public.cfdi_use_catalog(code);
  end if;
end $$;

alter table public.fiscal_regime_catalog enable row level security;
alter table public.cfdi_use_catalog enable row level security;

drop policy if exists beta_authenticated_select on public.fiscal_regime_catalog;
drop policy if exists beta_authenticated_select on public.cfdi_use_catalog;

create policy beta_authenticated_select
on public.fiscal_regime_catalog
for select
to authenticated
using (true);

create policy beta_authenticated_select
on public.cfdi_use_catalog
for select
to authenticated
using (true);

create table if not exists public.project_invoices (
  id bigint generated by default as identity primary key,
  client_project_id bigint not null references public.client_projects(id) on delete cascade,
  client_id bigint not null references public.clients(id) on delete cascade,
  source_type text not null default 'manual' check (source_type in ('quote', 'advance', 'partial', 'balance', 'service', 'manual')),
  source_quote_id bigint references public.quotes(id) on delete set null,
  source_service_report_id bigint references public.service_reports(id) on delete set null,
  invoice_date date not null default current_date,
  subtotal_mxn numeric(14,2) not null check (subtotal_mxn >= 0),
  iva_mxn numeric(14,2) not null default 0 check (iva_mxn >= 0),
  total_mxn numeric(14,2) not null check (total_mxn >= 0),
  status text not null default 'draft' check (status in ('draft', 'issued', 'cancelled', 'paid')),
  facturama_id text,
  sat_uuid text,
  xml_url text,
  pdf_url text,
  created_at timestamptz not null default now()
);

alter table public.project_invoices
  add column if not exists client_project_id bigint references public.client_projects(id) on delete cascade,
  add column if not exists client_id bigint references public.clients(id) on delete cascade,
  add column if not exists source_type text default 'manual',
  add column if not exists source_quote_id bigint references public.quotes(id) on delete set null,
  add column if not exists source_service_report_id bigint references public.service_reports(id) on delete set null,
  add column if not exists invoice_date date default current_date,
  add column if not exists subtotal_mxn numeric(14,2),
  add column if not exists iva_mxn numeric(14,2),
  add column if not exists total_mxn numeric(14,2),
  add column if not exists status text default 'draft',
  add column if not exists facturama_id text,
  add column if not exists sat_uuid text,
  add column if not exists xml_url text,
  add column if not exists pdf_url text,
  add column if not exists created_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_invoices'
      and column_name = 'subtotal'
  ) then
    execute 'update public.project_invoices set subtotal_mxn = coalesce(subtotal_mxn, subtotal)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_invoices'
      and column_name = 'iva'
  ) then
    execute 'update public.project_invoices set iva_mxn = coalesce(iva_mxn, iva)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_invoices'
      and column_name = 'total'
  ) then
    execute 'update public.project_invoices set total_mxn = coalesce(total_mxn, total)';
  end if;
end $$;

update public.project_invoices
set
  subtotal_mxn = coalesce(subtotal_mxn, 0),
  iva_mxn = coalesce(iva_mxn, 0),
  total_mxn = coalesce(total_mxn, coalesce(subtotal_mxn, 0) + coalesce(iva_mxn, 0)),
  status = coalesce(status, 'draft'),
  source_type = coalesce(source_type, 'manual'),
  invoice_date = coalesce(invoice_date, current_date),
  created_at = coalesce(created_at, now());

create table if not exists public.project_invoice_items (
  id bigint generated by default as identity primary key,
  project_invoice_id bigint not null references public.project_invoices(id) on delete cascade,
  source_quote_item_id bigint references public.quote_items(id) on delete set null,
  product_id bigint references public.products(id) on delete set null,
  description text not null,
  quantity numeric(14,4) not null default 1 check (quantity > 0),
  unit_price_mxn numeric(14,2) not null check (unit_price_mxn >= 0),
  subtotal_mxn numeric(14,2) not null check (subtotal_mxn >= 0),
  iva_mxn numeric(14,2) not null default 0 check (iva_mxn >= 0),
  total_mxn numeric(14,2) not null check (total_mxn >= 0),
  sat_product_service_code text not null references public.sat_product_service_catalog(code),
  sat_unit_code text not null references public.sat_unit_catalog(code),
  sat_unit_name text not null,
  fiscal_object text not null default '02',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_invoice_items_invoice_id_idx
  on public.project_invoice_items(project_invoice_id);

create index if not exists project_invoice_items_product_id_idx
  on public.project_invoice_items(product_id);

alter table public.project_invoice_items enable row level security;

drop policy if exists beta_authenticated_select on public.project_invoice_items;
drop policy if exists beta_authenticated_insert on public.project_invoice_items;
drop policy if exists beta_authenticated_update on public.project_invoice_items;
drop policy if exists beta_authenticated_delete on public.project_invoice_items;

create policy beta_authenticated_select
on public.project_invoice_items
for select
to authenticated
using (true);

create policy beta_authenticated_insert
on public.project_invoice_items
for insert
to authenticated
with check (true);

create policy beta_authenticated_update
on public.project_invoice_items
for update
to authenticated
using (true)
with check (true);

create policy beta_authenticated_delete
on public.project_invoice_items
for delete
to authenticated
using (true);

create index if not exists project_invoices_client_project_id_idx
  on public.project_invoices(client_project_id);

create index if not exists project_invoices_client_id_idx
  on public.project_invoices(client_id);

create index if not exists project_invoices_invoice_date_idx
  on public.project_invoices(invoice_date);

create index if not exists project_invoices_status_idx
  on public.project_invoices(status);

create index if not exists project_invoices_facturama_id_idx
  on public.project_invoices(facturama_id);

create index if not exists project_invoices_source_quote_id_idx
  on public.project_invoices(source_quote_id);

alter table public.project_invoices enable row level security;

drop policy if exists beta_authenticated_select on public.project_invoices;
drop policy if exists beta_authenticated_insert on public.project_invoices;
drop policy if exists beta_authenticated_update on public.project_invoices;
drop policy if exists beta_authenticated_delete on public.project_invoices;

create policy beta_authenticated_select
on public.project_invoices
for select
to authenticated
using (true);

create policy beta_authenticated_insert
on public.project_invoices
for insert
to authenticated
with check (true);

create policy beta_authenticated_update
on public.project_invoices
for update
to authenticated
using (true)
with check (true);

create policy beta_authenticated_delete
on public.project_invoices
for delete
to authenticated
using (true);
