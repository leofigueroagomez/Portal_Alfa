alter table public.client_projects
  add column if not exists site_contact_name text,
  add column if not exists site_contact_phone text,
  add column if not exists site_address text,
  add column if not exists site_google_maps_url text;

notify pgrst, 'reload schema';
