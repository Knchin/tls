-- TLS RADAR — verify.sql
-- Read-only checks to confirm the migrations 0001-0004 applied correctly.
-- Safe to run in the Supabase SQL Editor at any time.

select 'destinations' as relation, count(*) as rows from public.destinations
union all select 'centres', count(*) from public.centres
union all select 'visa_categories', count(*) from public.visa_categories
union all select 'app_config', count(*) from public.app_config;

select event_object_table as table_name, trigger_name
  from information_schema.triggers
 where event_object_schema = 'public'
 order by 1, 2;

select tablename, policyname
  from pg_policies
 where schemaname = 'public'
 order by 1, 2;

select proname, prosecdef as security_definer
  from pg_proc
 where pronamespace = 'public'::regnamespace
   and proname in ('set_updated_at', 'handle_new_user', 'enforce_monitoring_limits')
 order by 1;

-- Expected results:
--   destinations     = 3 (FR, DE, BE)
--   centres          = 2 (TUNIS, SFAX)
--   visa_categories  = 9
--   app_config       = 2 (max_active_per_user=5, max_total_per_user=20)
--   triggers         = profiles_set_updated_at, monitoring_requests_set_updated_at,
--                      notification_preferences_set_updated_at, on_auth_user_created,
--                      monitoring_requests_enforce_limits
--   policies         = 1 per catalogue table (3 total) + 2 on profiles + 4 on
--                      monitoring_requests + 1 on availability_checks +
--                      1 on appointment_slots + 3 on notifications + 3 on
--                      notification_preferences
--   functions        = set_updated_at (invoker), handle_new_user (definer),
--                      enforce_monitoring_limits (invoker)
