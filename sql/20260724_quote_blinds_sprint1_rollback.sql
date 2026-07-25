-- Rollback for 20260724_quote_blinds_sprint1.sql.
-- Safe only before Sprint 2 data exists. The preflight checks abort instead of
-- deleting Persianas data or converting blinds quotes silently.

begin;

do $$
declare
  blind_detail_count bigint := 0;
  blind_quote_count bigint := 0;
begin
  if to_regclass('public.quote_blind_item_details') is not null then
    execute 'select count(*) from public.quote_blind_item_details'
      into blind_detail_count;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quotes'
      and column_name = 'quote_type'
  ) then
    execute $query$
      select count(*)
      from public.quotes
      where quote_type <> 'standard'
    $query$
    into blind_quote_count;
  end if;

  if blind_detail_count > 0 or blind_quote_count > 0 then
    raise exception
      'Rollback aborted: % blinds quotes and % blind item details must be exported or migrated first.',
      blind_quote_count,
      blind_detail_count;
  end if;
end $$;

drop trigger if exists enforce_quote_blind_item_detail_type
  on public.quote_blind_item_details;
drop trigger if exists set_quote_blind_item_details_updated_at
  on public.quote_blind_item_details;

drop table if exists public.quote_blind_item_details;

drop function if exists public.enforce_quote_blind_item_detail_type();

drop trigger if exists enforce_quote_group_quote_type_consistency
  on public.quotes;
drop function if exists public.enforce_quote_group_quote_type_consistency();

drop index if exists public.quotes_quote_type_created_at_idx;

alter table public.quotes
  drop constraint if exists quotes_quote_type_check,
  drop column if exists quote_type;

notify pgrst, 'reload schema';

commit;
