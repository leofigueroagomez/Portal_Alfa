-- Cotizaciones de Persianas - Sprint 1
-- Scope: schema, invariants, indexes and RLS only.
-- This migration intentionally does not add UI, save actions, PDF rendering,
-- operational synchronization, portal exposure or fiscal behavior.

begin;

-- Minimal shared RLS prerequisites. Production may not have the historical
-- hardening migration applied yet, so this release creates only the two
-- helpers required by the Persianas policies. Existing definitions are kept.
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

grant execute on function public.is_internal_user() to authenticated;
grant execute on function public.has_internal_role(text[]) to authenticated;

alter table public.quotes
  add column if not exists quote_type text;

update public.quotes
set quote_type = 'standard'
where quote_type is null;

alter table public.quotes
  alter column quote_type set default 'standard',
  alter column quote_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.quotes'::regclass
      and conname = 'quotes_quote_type_check'
  ) then
    alter table public.quotes
      add constraint quotes_quote_type_check
      check (quote_type in ('standard', 'blinds'));
  end if;
end $$;

create index if not exists quotes_quote_type_created_at_idx
  on public.quotes (quote_type, created_at desc);

comment on column public.quotes.quote_type
  is 'Commercial quote vertical. Existing quotes default to standard; blinds is reserved for the Persianas vertical.';

create or replace function public.enforce_quote_group_quote_type_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.quote_group_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.quotes existing_quote
    where existing_quote.quote_group_id = new.quote_group_id
      and existing_quote.id is distinct from new.id
      and existing_quote.quote_type <> new.quote_type
  ) then
    raise exception
      'All versions in quote_group_id % must use quote_type %.',
      new.quote_group_id,
      new.quote_type
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_quote_group_quote_type_consistency
  on public.quotes;

create trigger enforce_quote_group_quote_type_consistency
before insert or update of quote_group_id, quote_type on public.quotes
for each row execute function public.enforce_quote_group_quote_type_consistency();

create table if not exists public.quote_blind_item_details (
  quote_item_id bigint primary key
    references public.quote_items(id) on delete cascade,
  width_cm numeric(10,2) not null,
  height_cm numeric(10,2) not null,
  calculated_m2_per_unit numeric(14,4)
    generated always as (
      round((width_cm * height_cm) / 10000::numeric, 4)
    ) stored,
  blind_type text not null,
  collection text,
  color text,
  mechanism text,
  control text,
  price_per_m2_mxn numeric(14,2) not null default 0,
  billable_m2_override numeric(14,4),
  override_reason text,
  reference_image_path text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_blind_item_details_width_positive
    check (width_cm > 0),
  constraint quote_blind_item_details_height_positive
    check (height_cm > 0),
  constraint quote_blind_item_details_type_not_blank
    check (nullif(btrim(blind_type), '') is not null),
  constraint quote_blind_item_details_price_nonnegative
    check (price_per_m2_mxn >= 0),
  constraint quote_blind_item_details_override_complete
    check (
      (
        billable_m2_override is null
        and override_reason is null
      )
      or (
        billable_m2_override > 0
        and nullif(btrim(override_reason), '') is not null
      )
    ),
  constraint quote_blind_item_details_reference_image_path_check
    check (
      reference_image_path is null
      or (
        length(reference_image_path) <= 1024
        and reference_image_path like 'quote-blinds/%'
        and reference_image_path !~ '(^|/)\.\.(/|$)'
        and reference_image_path !~ '^(https?:|data:)'
        and position('//' in reference_image_path) = 0
      )
    )
);

create index if not exists quote_blind_item_details_blind_type_idx
  on public.quote_blind_item_details (blind_type);

comment on table public.quote_blind_item_details
  is 'One-to-one Persianas-specific extension for public.quote_items. Shared commercial, fiscal and ordering fields remain on quote_items.';

comment on column public.quote_blind_item_details.calculated_m2_per_unit
  is 'Generated area per unit: width_cm * height_cm / 10000, rounded to four decimals.';

comment on column public.quote_blind_item_details.billable_m2_override
  is 'Optional manual override for total billable square meters. The calculated value remains derivable from dimensions and quote_items.quantity.';

comment on column public.quote_blind_item_details.override_reason
  is 'Required business justification when billable_m2_override is present.';

comment on column public.quote_blind_item_details.reference_image_path
  is 'Persistent object path under a private Storage bucket, using quote-blinds/{quoteId}/...; never store a signed URL.';

comment on column public.quote_blind_item_details.internal_notes
  is 'Internal-only notes. This field must never be rendered in customer-facing documents or portal responses.';

create or replace function public.enforce_quote_blind_item_detail_type()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.quote_items qi
    join public.quotes q on q.id = qi.quote_id
    where qi.id = new.quote_item_id
      and q.quote_type = 'blinds'
  ) then
    raise exception
      'quote_blind_item_details requires a quote_item from a blinds quote.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_quote_blind_item_detail_type
  on public.quote_blind_item_details;

create trigger enforce_quote_blind_item_detail_type
before insert or update of quote_item_id on public.quote_blind_item_details
for each row execute function public.enforce_quote_blind_item_detail_type();

drop trigger if exists set_quote_blind_item_details_updated_at
  on public.quote_blind_item_details;

create trigger set_quote_blind_item_details_updated_at
before update on public.quote_blind_item_details
for each row execute function public.set_updated_at();

alter table public.quote_blind_item_details enable row level security;

drop policy if exists quote_blind_item_details_select_internal
  on public.quote_blind_item_details;
drop policy if exists quote_blind_item_details_insert_commercial_engineering
  on public.quote_blind_item_details;
drop policy if exists quote_blind_item_details_update_commercial_engineering
  on public.quote_blind_item_details;
drop policy if exists quote_blind_item_details_delete_admin_direction
  on public.quote_blind_item_details;

create policy quote_blind_item_details_select_internal
on public.quote_blind_item_details
for select
to authenticated
using (public.is_internal_user());

create policy quote_blind_item_details_insert_commercial_engineering
on public.quote_blind_item_details
for insert
to authenticated
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
  and exists (
    select 1
    from public.quote_items qi
    join public.quotes q on q.id = qi.quote_id
    where qi.id = quote_blind_item_details.quote_item_id
      and q.quote_type = 'blinds'
  )
);

create policy quote_blind_item_details_update_commercial_engineering
on public.quote_blind_item_details
for update
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
  and exists (
    select 1
    from public.quote_items qi
    join public.quotes q on q.id = qi.quote_id
    where qi.id = quote_blind_item_details.quote_item_id
      and q.quote_type = 'blinds'
  )
)
with check (
  public.has_internal_role(array['admin', 'direccion', 'comercial', 'ingenieria'])
  and exists (
    select 1
    from public.quote_items qi
    join public.quotes q on q.id = qi.quote_id
    where qi.id = quote_blind_item_details.quote_item_id
      and q.quote_type = 'blinds'
  )
);

create policy quote_blind_item_details_delete_admin_direction
on public.quote_blind_item_details
for delete
to authenticated
using (
  public.has_internal_role(array['admin', 'direccion'])
  and exists (
    select 1
    from public.quote_items qi
    join public.quotes q on q.id = qi.quote_id
    where qi.id = quote_blind_item_details.quote_item_id
      and q.quote_type = 'blinds'
  )
);

notify pgrst, 'reload schema';

commit;
