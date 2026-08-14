-- TLS RADAR — 0001_base_tables.sql
-- Base tables, indexes, and updated_at machinery.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- monitoring_requests
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.monitoring_status as enum (
    'ACTIVE', 'PAUSED', 'MATCH_FOUND', 'ERROR', 'DISABLED'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.monitoring_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  country text not null default 'TN',
  destination text not null,
  centre text not null,
  visa_category text not null,
  earliest_date date,
  latest_date date,
  status public.monitoring_status not null default 'ACTIVE',
  check_interval_minutes integer not null default 5
    check (check_interval_minutes between 5 and 1440),
  last_checked_at timestamptz,
  last_available_at timestamptz,
  last_error_code text,
  consecutive_errors integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint monitoring_dates_ordered check (
    earliest_date is null
    or latest_date is null
    or earliest_date <= latest_date
  )
);

create index monitoring_requests_user_id_idx
  on public.monitoring_requests (user_id);
create index monitoring_requests_status_idx
  on public.monitoring_requests (status);
create index monitoring_requests_due_idx
  on public.monitoring_requests (status, last_checked_at);

create trigger monitoring_requests_set_updated_at
  before update on public.monitoring_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- availability_checks
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.availability_source_status as enum (
    'AVAILABLE', 'NOT_AVAILABLE', 'TEMPORARY_ERROR'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.availability_checks (
  id uuid primary key default gen_random_uuid(),
  monitoring_request_id uuid not null
    references public.monitoring_requests (id) on delete cascade,
  checked_at timestamptz not null default timezone('utc', now()),
  status public.availability_source_status not null,
  available boolean not null,
  result_hash text,
  error_code text,
  response_time_ms integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index availability_checks_request_idx
  on public.availability_checks (monitoring_request_id, checked_at desc);

-- ---------------------------------------------------------------------------
-- appointment_slots
-- ---------------------------------------------------------------------------

create table if not exists public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  availability_check_id uuid not null
    references public.availability_checks (id) on delete cascade,
  appointment_date date not null,
  appointment_time time,
  created_at timestamptz not null default timezone('utc', now())
);

create index appointment_slots_check_idx
  on public.appointment_slots (availability_check_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.notification_type as enum (
    'APPOINTMENT_AVAILABLE', 'MONITORING_ERROR', 'SYSTEM'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_channel as enum ('IN_APP', 'EMAIL', 'PUSH');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_status as enum (
    'PENDING', 'SENT', 'FAILED', 'READ', 'DISMISSED'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monitoring_request_id uuid
    references public.monitoring_requests (id) on delete set null,
  type public.notification_type not null,
  channel public.notification_channel not null,
  title text not null,
  message text not null,
  status public.notification_status not null default 'PENDING',
  result_hash text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index notifications_status_idx
  on public.notifications (status);

-- ---------------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------------

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- app_config (used by monitoring-limit enforcement)
-- ---------------------------------------------------------------------------

create table if not exists public.app_config (
  key text primary key,
  value integer not null
);

insert into public.app_config (key, value)
values
  ('max_active_per_user', 5),
  ('max_total_per_user', 20)
on conflict (key) do nothing;
