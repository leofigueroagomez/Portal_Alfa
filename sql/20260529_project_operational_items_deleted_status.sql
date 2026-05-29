do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'project_operational_items'
  ) then
    alter table public.project_operational_items
      drop constraint if exists project_operational_items_status_check;

    alter table public.project_operational_items
      add constraint project_operational_items_status_check
      check (status in (
        'draft',
        'active',
        'locked',
        'purchased',
        'partially_purchased',
        'delivered',
        'pending_director_approval',
        'deleted'
      ));
  end if;
end $$;

notify pgrst, 'reload schema';
