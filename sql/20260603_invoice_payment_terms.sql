create table if not exists public.sat_payment_form_catalog (
  code text primary key,
  name text not null,
  is_active boolean not null default true
);

insert into public.sat_payment_form_catalog (code, name, is_active)
values
  ('01', 'Efectivo', true),
  ('02', 'Cheque nominativo', true),
  ('03', 'Transferencia electronica de fondos', true),
  ('04', 'Tarjeta de credito', true),
  ('05', 'Monedero electronico', true),
  ('06', 'Dinero electronico', true),
  ('08', 'Vales de despensa', true),
  ('12', 'Dacion en pago', true),
  ('13', 'Pago por subrogacion', true),
  ('14', 'Pago por consignacion', true),
  ('15', 'Condonacion', true),
  ('17', 'Compensacion', true),
  ('23', 'Novacion', true),
  ('24', 'Confusion', true),
  ('25', 'Remision de deuda', true),
  ('26', 'Prescripcion o caducidad', true),
  ('27', 'A satisfaccion del acreedor', true),
  ('28', 'Tarjeta de debito', true),
  ('29', 'Tarjeta de servicios', true),
  ('30', 'Aplicacion de anticipos', true),
  ('31', 'Intermediario pagos', true),
  ('99', 'Por definir', true)
on conflict (code) do update
set
  name = excluded.name,
  is_active = excluded.is_active;

alter table public.project_invoices
  add column if not exists payment_method_code text,
  add column if not exists payment_form_code text,
  add column if not exists requires_payment_complement boolean,
  add column if not exists payment_complement_status text;

update public.project_invoices
set
  payment_method_code = coalesce(nullif(payment_method_code, ''), 'PUE'),
  payment_form_code = coalesce(nullif(payment_form_code, ''), '03');

update public.project_invoices
set payment_method_code = 'PUE'
where payment_method_code not in ('PUE', 'PPD');

update public.project_invoices
set
  payment_form_code = '99'
where payment_method_code = 'PPD';

update public.project_invoices p
set payment_form_code = '03'
where p.payment_method_code = 'PUE'
  and not exists (
    select 1
    from public.sat_payment_form_catalog spfc
    where spfc.code = p.payment_form_code
  );

update public.project_invoices
set
  requires_payment_complement = payment_method_code = 'PPD',
  payment_complement_status = case
    when payment_method_code = 'PPD' then 'pending'
    else 'not_required'
  end;

alter table public.project_invoices
  alter column payment_method_code set default 'PUE',
  alter column payment_method_code set not null,
  alter column payment_form_code set default '03',
  alter column payment_form_code set not null,
  alter column requires_payment_complement set default false,
  alter column requires_payment_complement set not null,
  alter column payment_complement_status set default 'not_required',
  alter column payment_complement_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_invoices_payment_method_code_check'
  ) then
    alter table public.project_invoices
      add constraint project_invoices_payment_method_code_check
      check (payment_method_code in ('PUE', 'PPD'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_invoices_payment_form_code_fkey'
  ) then
    alter table public.project_invoices
      add constraint project_invoices_payment_form_code_fkey
      foreign key (payment_form_code)
      references public.sat_payment_form_catalog(code);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_invoices_payment_complement_status_check'
  ) then
    alter table public.project_invoices
      add constraint project_invoices_payment_complement_status_check
      check (payment_complement_status in ('not_required', 'pending', 'partial', 'completed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_invoices_ppd_payment_form_check'
  ) then
    alter table public.project_invoices
      add constraint project_invoices_ppd_payment_form_check
      check (
        (payment_method_code = 'PPD' and payment_form_code = '99')
        or payment_method_code = 'PUE'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_invoices_payment_complement_rule_check'
  ) then
    alter table public.project_invoices
      add constraint project_invoices_payment_complement_rule_check
      check (
        (
          payment_method_code = 'PPD'
          and requires_payment_complement = true
          and payment_complement_status in ('pending', 'partial', 'completed')
        )
        or (
          payment_method_code = 'PUE'
          and requires_payment_complement = false
          and payment_complement_status = 'not_required'
        )
      );
  end if;
end $$;

alter table public.sat_payment_form_catalog enable row level security;

drop policy if exists beta_authenticated_select on public.sat_payment_form_catalog;

create policy beta_authenticated_select
on public.sat_payment_form_catalog
for select
to authenticated
using (true);

create extension if not exists pg_trgm with schema extensions;

create index if not exists sat_payment_form_catalog_name_trgm_idx
  on public.sat_payment_form_catalog using gin (name gin_trgm_ops);

create index if not exists project_invoices_payment_method_code_idx
  on public.project_invoices(payment_method_code);

create index if not exists project_invoices_payment_complement_status_idx
  on public.project_invoices(payment_complement_status);
