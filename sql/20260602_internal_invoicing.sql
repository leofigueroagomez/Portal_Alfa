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

create table if not exists public.tax_object_catalog (
  code text primary key,
  name text not null,
  is_active boolean not null default true
);

insert into public.tax_object_catalog (code, name, is_active)
values
  ('01', 'No objeto de impuesto.', true),
  ('02', 'Si objeto de impuesto.', true),
  ('03', 'Si objeto del impuesto y no obligado al desglose.', true),
  ('04', 'Si objeto del impuesto y no causa impuesto.', true),
  ('05', 'Si objeto del impuesto, IVA credito PODEBI.', true),
  ('06', 'Si objeto del IVA, No traslado IVA.', true),
  ('07', 'No traslado del IVA, Si desglose IEPS.', true),
  ('08', 'No traslado del IVA, No desglose IEPS.', true)
on conflict (code) do update
set
  name = excluded.name,
  is_active = excluded.is_active;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'sat_product_key'
  ) then
    execute 'update public.products p
      set sat_product_service_code = nullif(p.sat_product_key, '''')
      where p.sat_product_service_code is null
        and nullif(p.sat_product_key, '''') is not null
        and exists (
          select 1
          from public.sat_product_service_catalog spsc
          where spsc.code = nullif(p.sat_product_key, '''')
        )';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'sat_unit_key'
  ) then
    execute 'update public.products p
      set sat_unit_code = nullif(p.sat_unit_key, '''')
      where p.sat_unit_code is null
        and nullif(p.sat_unit_key, '''') is not null
        and exists (
          select 1
          from public.sat_unit_catalog suc
          where suc.code = nullif(p.sat_unit_key, '''')
        )';
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

update public.products
set fiscal_object = '02'
where fiscal_object is null
   or not exists (
    select 1
    from public.tax_object_catalog toc
    where toc.code = public.products.fiscal_object
  );

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

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_fiscal_object_fkey'
  ) then
    alter table public.products
      add constraint products_fiscal_object_fkey
      foreign key (fiscal_object)
      references public.tax_object_catalog(code);
  end if;
end $$;

alter table public.sat_product_service_catalog enable row level security;
alter table public.sat_unit_catalog enable row level security;
alter table public.tax_object_catalog enable row level security;

drop policy if exists beta_authenticated_select on public.sat_product_service_catalog;
drop policy if exists beta_authenticated_select on public.sat_unit_catalog;
drop policy if exists beta_authenticated_select on public.tax_object_catalog;

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

create policy beta_authenticated_select
on public.tax_object_catalog
for select
to authenticated
using (true);

create extension if not exists pg_trgm with schema extensions;

create index if not exists sat_product_service_catalog_description_trgm_idx
  on public.sat_product_service_catalog using gin (description gin_trgm_ops);

create index if not exists sat_unit_catalog_name_trgm_idx
  on public.sat_unit_catalog using gin (name gin_trgm_ops);

create index if not exists sat_unit_catalog_description_trgm_idx
  on public.sat_unit_catalog using gin (description gin_trgm_ops);

create index if not exists tax_object_catalog_name_trgm_idx
  on public.tax_object_catalog using gin (name gin_trgm_ops);

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
  ('606', 'Arrendamiento', 'physical', true),
  ('607', 'Regimen de Enajenacion o Adquisicion de Bienes', 'physical', true),
  ('608', 'Demas ingresos', 'physical', true),
  ('610', 'Residentes en el Extranjero sin Establecimiento Permanente en Mexico', 'both', true),
  ('611', 'Ingresos por Dividendos socios y accionistas', 'physical', true),
  ('612', 'Personas Fisicas con Actividades Empresariales y Profesionales', 'physical', true),
  ('614', 'Ingresos por intereses', 'physical', true),
  ('615', 'Regimen de los ingresos por obtencion de premios', 'physical', true),
  ('616', 'Sin obligaciones fiscales', 'physical', true),
  ('620', 'Sociedades Cooperativas de Produccion que optan por diferir sus ingresos', 'moral', true),
  ('621', 'Incorporacion Fiscal', 'physical', true),
  ('622', 'Actividades Agricolas, Ganaderas, Silvicolas y Pesqueras', 'moral', true),
  ('623', 'Opcional para Grupos de Sociedades', 'moral', true),
  ('624', 'Coordinados', 'moral', true),
  ('625', 'Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas', 'physical', true),
  ('626', 'Regimen Simplificado de Confianza', 'both', true)
on conflict (code) do update
set
  name = excluded.name,
  applies_to_person_type = excluded.applies_to_person_type,
  is_active = excluded.is_active;

insert into public.cfdi_use_catalog (code, name, applies_to_person_type, is_active)
values
  ('G01', 'Adquisicion de mercancias.', 'both', true),
  ('G02', 'Devoluciones, descuentos o bonificaciones.', 'both', true),
  ('G03', 'Gastos en general.', 'both', true),
  ('I01', 'Construcciones.', 'both', true),
  ('I02', 'Mobiliario y equipo de oficina por inversiones.', 'both', true),
  ('I03', 'Equipo de transporte.', 'both', true),
  ('I04', 'Equipo de computo y accesorios.', 'both', true),
  ('I05', 'Dados, troqueles, moldes, matrices y herramental.', 'both', true),
  ('I06', 'Comunicaciones telefonicas.', 'both', true),
  ('I07', 'Comunicaciones satelitales.', 'both', true),
  ('I08', 'Otra maquinaria y equipo.', 'both', true),
  ('D01', 'Honorarios medicos, dentales y gastos hospitalarios.', 'physical', true),
  ('D02', 'Gastos medicos por incapacidad o discapacidad.', 'physical', true),
  ('D03', 'Gastos funerales.', 'physical', true),
  ('D04', 'Donativos.', 'physical', true),
  ('D05', 'Intereses reales efectivamente pagados por creditos hipotecarios casa habitacion.', 'physical', true),
  ('D06', 'Aportaciones voluntarias al SAR.', 'physical', true),
  ('D07', 'Primas por seguros de gastos medicos.', 'physical', true),
  ('D08', 'Gastos de transportacion escolar obligatoria.', 'physical', true),
  ('D09', 'Depositos en cuentas para el ahorro, primas que tengan como base planes de pensiones.', 'physical', true),
  ('D10', 'Pagos por servicios educativos colegiaturas.', 'physical', true),
  ('S01', 'Sin efectos fiscales.', 'both', true),
  ('CP01', 'Pagos', 'both', true),
  ('CN01', 'Nomina', 'physical', true)
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

create index if not exists fiscal_regime_catalog_name_trgm_idx
  on public.fiscal_regime_catalog using gin (name gin_trgm_ops);

create index if not exists cfdi_use_catalog_name_trgm_idx
  on public.cfdi_use_catalog using gin (name gin_trgm_ops);

create table if not exists public.project_invoices (
  id bigint generated by default as identity primary key,
  internal_folio text not null unique,
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
  add column if not exists internal_folio text,
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

create sequence if not exists public.project_invoice_internal_folio_seq;

create or replace function public.next_project_invoice_internal_folio()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  sequence_number bigint;
  candidate text;
begin
  loop
    sequence_number := nextval('public.project_invoice_internal_folio_seq'::regclass);
    candidate := 'FAC-' || lpad(sequence_number::text, 4, '0');

    if not exists (
      select 1
      from public.project_invoices
      where internal_folio = candidate
    ) then
      return candidate;
    end if;
  end loop;
end;
$$;

do $$
declare
  next_number bigint;
  max_number bigint;
  row_to_fix record;
  candidate text;
begin
  select coalesce(
    max(substring(internal_folio from '^FAC-(?:[0-9]{4}-)?([0-9]+)$')::bigint),
    0
  ) + 1
  into next_number
  from public.project_invoices
  where internal_folio ~ '^FAC-(?:[0-9]{4}-)?[0-9]+$';

  for row_to_fix in
    select id
    from (
      select
        id,
        internal_folio,
        row_number() over (partition by internal_folio order by id) as duplicate_number
      from public.project_invoices
    ) candidates
    where nullif(trim(coalesce(internal_folio, '')), '') is null
       or duplicate_number > 1
    order by id
  loop
    loop
      candidate := 'FAC-' || lpad(next_number::text, 4, '0');
      next_number := next_number + 1;

      exit when not exists (
        select 1
        from public.project_invoices
        where internal_folio = candidate
      );
    end loop;

    update public.project_invoices
    set internal_folio = candidate
    where id = row_to_fix.id;
  end loop;

  select coalesce(
    max(substring(internal_folio from '^FAC-(?:[0-9]{4}-)?([0-9]+)$')::bigint),
    0
  )
  into max_number
  from public.project_invoices
  where internal_folio ~ '^FAC-(?:[0-9]{4}-)?[0-9]+$';

  perform setval(
    'public.project_invoice_internal_folio_seq'::regclass,
    greatest(max_number, 1),
    true
  );
end $$;

alter table public.project_invoices
  alter column internal_folio set default public.next_project_invoice_internal_folio(),
  alter column internal_folio set not null;

create unique index if not exists project_invoices_internal_folio_uidx
  on public.project_invoices(internal_folio);

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
  fiscal_object text not null default '02' references public.tax_object_catalog(code),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

update public.project_invoice_items
set fiscal_object = '02'
where fiscal_object is null
   or not exists (
    select 1
    from public.tax_object_catalog toc
    where toc.code = public.project_invoice_items.fiscal_object
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_invoice_items_fiscal_object_fkey'
  ) then
    alter table public.project_invoice_items
      add constraint project_invoice_items_fiscal_object_fkey
      foreign key (fiscal_object)
      references public.tax_object_catalog(code);
  end if;
end $$;

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
