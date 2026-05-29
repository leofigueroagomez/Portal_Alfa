do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'project_purchase_lines'
  ) and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'project_operational_items'
  ) then
    alter table public.project_purchase_lines
      add column if not exists project_operational_item_id bigint
        references public.project_operational_items(id) on delete set null;

    create index if not exists project_purchase_lines_operational_item_id_idx
      on public.project_purchase_lines(project_operational_item_id);

    update public.project_purchase_lines ppl
    set project_operational_item_id = poi.id,
        updated_at = now()
    from public.project_operational_items poi
    where ppl.project_operational_item_id is null
      and ppl.quote_item_id is not null
      and poi.source_quote_item_id = ppl.quote_item_id;
  end if;
end $$;
