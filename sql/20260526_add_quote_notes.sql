alter table if exists public.quotes
  add column if not exists notes text;

alter table if exists public.engineering_quotes
  add column if not exists notes text;
