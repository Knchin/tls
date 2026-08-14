-- TLS RADAR — 0003_rls.sql
-- Row Level Security policies. Enforcement is at the database, never only in
-- the frontend. The server-side monitoring runner uses the service-role key,
-- which bypasses RLS by design; all authenticated reads/writes go through
-- these policies.

alter table public.profiles enable row level security;
alter table public.monitoring_requests enable row level security;
alter table public.availability_checks enable row level security;
alter table public.appointment_slots enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- monitoring_requests
-- ---------------------------------------------------------------------------

create policy "Users can view their own monitoring requests"
  on public.monitoring_requests for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can create monitoring requests"
  on public.monitoring_requests for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own monitoring requests"
  on public.monitoring_requests for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own monitoring requests"
  on public.monitoring_requests for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- availability_checks (via ownership of the parent request)
-- ---------------------------------------------------------------------------

create policy "Users can read checks for their own requests"
  on public.availability_checks for select
  to authenticated
  using (
    exists (
      select 1
      from public.monitoring_requests mr
      where mr.id = availability_checks.monitoring_request_id
        and mr.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- appointment_slots (via the availability check)
-- ---------------------------------------------------------------------------

create policy "Users can read slots for their own requests"
  on public.appointment_slots for select
  to authenticated
  using (
    exists (
      select 1
      from public.availability_checks ac
      join public.monitoring_requests mr
        on mr.id = ac.monitoring_request_id
      where ac.id = appointment_slots.availability_check_id
        and mr.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create policy "Users can read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------------

create policy "Users can read their own notification preferences"
  on public.notification_preferences for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can upsert their own notification preferences"
  on public.notification_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own notification preferences"
  on public.notification_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
