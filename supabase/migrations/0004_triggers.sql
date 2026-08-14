-- TLS RADAR — 0004_triggers.sql
-- Automatic profile/preferences creation on signup, and monitoring limits
-- enforced at the database level.

-- ---------------------------------------------------------------------------
-- handle_new_user: create profile + notification preferences on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, null);

  insert into public.notification_preferences (id, user_id)
  values (gen_random_uuid(), new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- enforce_monitoring_limits
-- Rejects inserts beyond the total job limit and status transitions to ACTIVE
-- beyond the active job limit. Limits live in public.app_config.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_monitoring_limits()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  active_limit integer;
  total_limit integer;
  existing_count integer;
begin
  select coalesce((select value from public.app_config where key = 'max_active_per_user'), 5)
    into active_limit;
  select coalesce((select value from public.app_config where key = 'max_total_per_user'), 20)
    into total_limit;

  if tg_op = 'INSERT' then
    select count(*)
      into existing_count
      from public.monitoring_requests
      where user_id = new.user_id;

    if existing_count >= total_limit then
      raise exception 'You have reached the maximum number of monitoring jobs (%) for your account.', total_limit
        using errcode = '22000';
    end if;
  end if;

  if new.status = 'ACTIVE' then
    select count(*)
      into existing_count
      from public.monitoring_requests
      where user_id = new.user_id
        and status = 'ACTIVE'
        and id <> new.id;

    if existing_count >= active_limit then
      raise exception 'You have reached the maximum number of active monitoring jobs (%). Pause or delete one before starting another.', active_limit
        using errcode = '22000';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists monitoring_requests_enforce_limits on public.monitoring_requests;
create trigger monitoring_requests_enforce_limits
  before insert or update of status on public.monitoring_requests
  for each row execute function public.enforce_monitoring_limits();
