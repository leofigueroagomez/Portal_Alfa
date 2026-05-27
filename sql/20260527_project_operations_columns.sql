alter table public.client_projects
  add column if not exists crew_lead_name text,
  add column if not exists crew_lead_phone text;
