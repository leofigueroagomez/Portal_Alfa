alter table public.service_reports
  add column if not exists service_discount_mxn numeric(14,2) not null default 0,
  add column if not exists service_discount_percent numeric(8,4) not null default 0,
  add column if not exists service_discount_type text not null default 'none',
  add column if not exists service_discount_reason text;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'service_reports'
  ) then
    alter table public.service_reports
      drop constraint if exists service_reports_service_discount_type_check;

    alter table public.service_reports
      add constraint service_reports_service_discount_type_check
      check (service_discount_type in ('none', 'amount', 'percent'));
  end if;
end $$;
