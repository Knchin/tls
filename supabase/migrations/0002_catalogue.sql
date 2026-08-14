-- TLS RADAR — 0002_catalogue.sql
-- Configurable catalogue of destinations, centres, and visa categories.
--
-- IMPORTANT: These rows are SEED PLACEHOLDERS. The product team must verify
-- each entry against the live TLScontact site for the Tunisia centres before
-- enabling monitoring for it. The application never hardcodes this data in the
-- frontend; everything is read from these tables.

create table if not exists public.destinations (
  code text primary key,
  label text not null,
  official_url text,
  enabled boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.centres (
  code text primary key,
  label text not null,
  country text not null default 'TN',
  enabled boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.visa_categories (
  code text primary key,
  destination text not null references public.destinations (code) on delete cascade,
  label text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0
);

insert into public.destinations (code, label, official_url, enabled, sort_order) values
  ('FR', 'France', 'https://visas-fr.tlscontact.com/en-us/country/tn', true, 1),
  ('DE', 'Germany', 'https://visas-de.tlscontact.com/en-us/country/tn', true, 2),
  ('BE', 'Belgium', 'https://visas-be.tlscontact.com/en-us/country/tn', true, 3)
on conflict (code) do nothing;

insert into public.centres (code, label, country, enabled, sort_order) values
  ('TUNIS', 'Tunis', 'TN', true, 1),
  ('SFAX', 'Sfax', 'TN', true, 2)
on conflict (code) do nothing;

insert into public.visa_categories (code, destination, label, enabled, sort_order) values
  ('FR_TOURIST_SHORT_STAY', 'FR', 'Tourist / Short Stay', true, 1),
  ('FR_FAMILY_PRIVATE_VISIT', 'FR', 'Family / Private Visit', true, 2),
  ('FR_BUSINESS', 'FR', 'Business', true, 3),
  ('FR_STUDENT', 'FR', 'Student', true, 4),
  ('FR_WORK', 'FR', 'Work', true, 5),
  ('DE_SHORT_STAY', 'DE', 'Short Stay (Schengen)', true, 1),
  ('DE_LONG_STAY', 'DE', 'Long Stay (National)', true, 2),
  ('BE_SHORT_STAY', 'BE', 'Short Stay (Schengen)', true, 1),
  ('BE_LONG_STAY', 'BE', 'Long Stay (National)', true, 2)
on conflict (code) do nothing;

alter table public.destinations enable row level security;
alter table public.centres enable row level security;
alter table public.visa_categories enable row level security;

create policy "Catalogue is readable by everyone"
  on public.destinations for select
  to authenticated
  using (true);

create policy "Catalogue is readable by everyone"
  on public.centres for select
  to authenticated
  using (true);

create policy "Catalogue is readable by everyone"
  on public.visa_categories for select
  to authenticated
  using (true);
