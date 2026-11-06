-- Facturar al aliado comercial (HQE -> Ali, Kybit -> NOWORANGE).
--
-- NO APLICAR EN PRODUCCION sin respaldo y OK de Leonardo.
-- Copia identica en sql/20261104_commercial_partner_billing.sql.
--
-- Solo agrega columnas nullable / con default, FK y CHECK como NOT VALID
-- (no escanea ni bloquea filas existentes) y un trigger que protege los
-- campos fiscales del aliado. NO hace backfill: ver
-- scripts/backfill_partner_billing.sql y scripts/backfill_project_partners.sql.
--
-- Rollback:
--   drop trigger if exists commercial_partners_guard_billing_fields on public.commercial_partners;
--   drop function if exists public.commercial_partners_guard_billing_fields();
--   alter table public.project_invoices drop column if exists billed_partner_id;
--   alter table public.client_projects drop column if exists commercial_partner_id;
--   alter table public.commercial_partners drop column if exists bill_to_partner;
--   alter table public.commercial_partners drop column if exists default_billing_client_id;

-- 1. Catalogo de aliados: cliente receptor fiscal por defecto.
alter table public.commercial_partners
  add column if not exists default_billing_client_id bigint,
  add column if not exists bill_to_partner boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'commercial_partners_default_billing_client_id_fkey'
  ) then
    alter table public.commercial_partners
      add constraint commercial_partners_default_billing_client_id_fkey
      foreign key (default_billing_client_id)
      references public.clients(id)
      on delete set null
      not valid;
  end if;
end $$;

comment on column public.commercial_partners.default_billing_client_id is
  'Cliente (clients.id) que recibe el CFDI cuando un proyecto se vende via este aliado. Reutiliza los datos fiscales de clients.';
comment on column public.commercial_partners.bill_to_partner is
  'Si es true, las facturas de proyectos de este aliado se preseleccionan a nombre de default_billing_client_id.';

-- 2. Aliado del proyecto. client_projects.client_id sigue siendo el cliente final.
alter table public.client_projects
  add column if not exists commercial_partner_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_projects_commercial_partner_id_fkey'
  ) then
    alter table public.client_projects
      add constraint client_projects_commercial_partner_id_fkey
      foreign key (commercial_partner_id)
      references public.commercial_partners(id)
      on delete set null
      not valid;
  end if;
end $$;

create index if not exists client_projects_commercial_partner_id_idx
  on public.client_projects(commercial_partner_id)
  where commercial_partner_id is not null;

comment on column public.client_projects.commercial_partner_id is
  'Aliado comercial via el que se vendio el proyecto (nullable). No reemplaza client_id (cliente final).';

-- 3. Trazabilidad en la factura: aliado al que se facturo (nullable).
alter table public.project_invoices
  add column if not exists billed_partner_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_invoices_billed_partner_id_fkey'
  ) then
    alter table public.project_invoices
      add constraint project_invoices_billed_partner_id_fkey
      foreign key (billed_partner_id)
      references public.commercial_partners(id)
      on delete set null
      not valid;
  end if;
end $$;

create index if not exists project_invoices_billed_partner_id_idx
  on public.project_invoices(billed_partner_id)
  where billed_partner_id is not null;

comment on column public.project_invoices.billed_partner_id is
  'Aliado comercial al que se facturo (solo trazabilidad). El receptor CFDI sigue saliendo de project_invoices.client_id.';

-- 4. Solo admin/direccion cambian los campos fiscales del aliado.
--    La policy de update de commercial_partners tambien deja pasar a
--    comercial (marca blanca); este trigger no la relaja ni la cambia,
--    solo bloquea que esos roles muevan el receptor fiscal.
--    auth.uid() null = SQL editor / service_role (scripts de backfill).
create or replace function public.commercial_partners_guard_billing_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.default_billing_client_id is not distinct from old.default_billing_client_id
     and new.bill_to_partner is not distinct from old.bill_to_partner then
    return new;
  end if;

  if tg_op = 'INSERT'
     and new.default_billing_client_id is null
     and new.bill_to_partner is true then
    return new;
  end if;

  -- Mismo helper que usan las policies vigentes de commercial_partners
  -- (perfil activo, interno y con rol permitido).
  if not public.has_internal_role(array['admin', 'direccion']) then
    raise exception 'Solo admin o direccion pueden cambiar el receptor fiscal del aliado.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.commercial_partners_guard_billing_fields() from public;

drop trigger if exists commercial_partners_guard_billing_fields on public.commercial_partners;
create trigger commercial_partners_guard_billing_fields
  before insert or update on public.commercial_partners
  for each row
  execute function public.commercial_partners_guard_billing_fields();
