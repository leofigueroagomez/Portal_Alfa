alter table public.project_site_visits
  add column if not exists updated_at timestamptz not null default now();

alter table public.project_site_visit_notes
  add column if not exists updated_at timestamptz not null default now();

alter table public.project_site_visit_note_photos
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_project_site_visits_updated_at
  on public.project_site_visits;
create trigger set_project_site_visits_updated_at
before update on public.project_site_visits
for each row
execute function public.set_updated_at();

drop trigger if exists set_project_site_visit_notes_updated_at
  on public.project_site_visit_notes;
create trigger set_project_site_visit_notes_updated_at
before update on public.project_site_visit_notes
for each row
execute function public.set_updated_at();

drop trigger if exists set_project_site_visit_note_photos_updated_at
  on public.project_site_visit_note_photos;
create trigger set_project_site_visit_note_photos_updated_at
before update on public.project_site_visit_note_photos
for each row
execute function public.set_updated_at();
