-- In-app notifications, the email outbox (sent by the send-emails Edge Function through Resend),
-- event triggers and unfinished-work reminders. Run AFTER 004_workspace.sql. Safe to re-run.
-- Nothing here sends an email by itself: rows are queued only after the real database event
-- succeeded, de-duplicated by a unique key, and delivered by supabase/functions/send-emails.

insert into public.app_settings (key, value) values
  ('app_url', ''),                       -- e.g. https://outlier.cfd (used in email links)
  ('support_email', ''),                 -- shown in emails
  ('reminder_unstarted_hours', '48'),    -- assigned but not started after this long
  ('reminder_inactive_hours', '96'),     -- in progress but nothing saved/tracked for this long
  ('reminder_deadline_days', '3'),       -- deadline within this many days
  ('reminder_min_gap_hours', '72'),      -- at most one reminder per project per this window
  ('reminder_max_per_project', '3')      -- and never more than this many in total
on conflict (key) do nothing;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  dedupe_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications for select using (user_id = auth.uid());

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_user uuid references auth.users(id) on delete set null,
  to_email text not null,
  type text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  related_id text,
  dedupe_key text not null unique,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','dead')),
  attempts integer not null default 0,
  last_error text,
  provider_id text,
  delivery_status text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_outbox_queue_idx on public.email_outbox(status, next_attempt_at);
alter table public.email_outbox enable row level security;
drop policy if exists "outbox admin read" on public.email_outbox;
create policy "outbox admin read" on public.email_outbox for select using (public.is_admin());

-- ------------------------------------------------------------------ helpers (never let a notification failure break the real action)
create or replace function public.queue_email(p_user uuid, p_to text, p_type text, p_subject text, p_payload jsonb, p_related text, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.email_outbox (to_user, to_email, type, subject, payload, related_id, dedupe_key)
  values (p_user, p_to, p_type, p_subject, coalesce(p_payload, '{}'::jsonb), p_related, p_key)
  on conflict (dedupe_key) do nothing;
exception when others then raise warning 'queue_email failed: %', sqlerrm;
end $$;

create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_key text, p_email_type text default null, p_payload jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare nid uuid; em text; nm text;
begin
  insert into public.notifications (user_id, kind, title, body, link, dedupe_key) values (p_user, p_kind, p_title, coalesce(p_body, ''), p_link, p_key)
    on conflict (dedupe_key) do nothing returning id into nid;
  if nid is not null and p_email_type is not null then
    select email, display_name into em, nm from public.profiles where id = p_user;
    if em is not null then
      perform public.queue_email(p_user, em, p_email_type, p_title, coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('name', coalesce(nm, 'there'), 'link', p_link), p_link, p_key);
    end if;
  end if;
exception when others then raise warning 'notify failed: %', sqlerrm;
end $$;

create or replace function public.notify_admins(p_kind text, p_title text, p_body text, p_link text, p_key text, p_email_type text default null, p_payload jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare adm record;
begin
  for adm in select id from public.profiles where role = 'admin' loop
    perform public.notify(adm.id, p_kind, p_title, p_body, p_link, p_key || ':' || adm.id::text, p_email_type, p_payload);
  end loop;
exception when others then raise warning 'notify_admins failed: %', sqlerrm;
end $$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
  get diagnostics n = row_count;
  return n;
end $$;

-- Percentage of the project's subtasks that are complete (null when the project has none).
create or replace function public.workspace_percent(p_assignment uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case when total = 0 then null else round(100.0 * done / total)::integer end
  from (
    select (select count(*) from jsonb_array_elements(coalesce(t.workspace_config->'subtasks', '[]'::jsonb))) as total,
           (select count(*) from jsonb_array_elements(coalesce(t.workspace_config->'subtasks', '[]'::jsonb)) st where coalesce(w.progress->>(st->>'id'), 'false') = 'true') as done
    from public.assignments a join public.tasks t on t.id = a.task_id left join public.workspaces w on w.assignment_id = a.id
    where a.id = p_assignment and (a.user_id = auth.uid() or public.is_admin() or auth.uid() is null)
  ) x;
$$;

-- ------------------------------------------------------------------ event triggers
create or replace function public.trg_profile_inserted() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins('registration', 'New tasker registered', new.display_name || ' is waiting for approval.', '/admin/taskers', 'reg-' || new.id::text);
  return new;
end $$;
drop trigger if exists trg_profile_inserted on public.profiles;
create trigger trg_profile_inserted after insert on public.profiles for each row execute function public.trg_profile_inserted();

create or replace function public.trg_profile_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.account_status = old.account_status then return new; end if;
  if new.account_status = 'approved' then
    perform public.notify(new.id, 'account_approved', 'Your account is approved', 'You can now browse projects, apply, and start working.', '/marketplace',
      'acct-' || new.id::text || '-approved-' || extract(epoch from now())::bigint::text, 'account_approved', '{}'::jsonb);
  elsif new.account_status = 'rejected' then
    perform public.notify(new.id, 'account_rejected', 'Your registration was not approved', coalesce(nullif(new.review_note, ''), 'An administrator did not approve this registration.'), '/dashboard',
      'acct-' || new.id::text || '-rejected-' || extract(epoch from now())::bigint::text, 'account_rejected', jsonb_build_object('reason', new.review_note));
  end if;
  return new;
end $$;
drop trigger if exists trg_profile_status on public.profiles;
create trigger trg_profile_status after update of account_status on public.profiles for each row execute function public.trg_profile_status();

create or replace function public.trg_user_confirmed() returns trigger language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if new.email_confirmed_at is not null and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    select display_name into nm from public.profiles where id = new.id;
    perform public.queue_email(new.id, new.email, 'welcome', 'Welcome to Outlier',
      jsonb_build_object('name', coalesce(nm, new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))), '/dashboard', 'welcome-' || new.id::text);
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_confirmed_update on auth.users;
create trigger on_auth_user_confirmed_update after update of email_confirmed_at on auth.users for each row execute function public.trg_user_confirmed();
drop trigger if exists on_auth_user_confirmed_insert on auth.users;
create trigger on_auth_user_confirmed_insert after insert on auth.users for each row execute function public.trg_user_confirmed();

create or replace function public.trg_assignment_created() returns trigger language plpgsql security definer set search_path = public as $$
declare t public.tasks;
begin
  select * into t from public.tasks where id = new.task_id;
  if new.source = 'assigned' then
    perform public.notify(new.user_id, 'project_assigned', 'New project assigned: ' || t.title, 'An administrator assigned you a project. Complete onboarding to begin.', '/projects/' || new.id::text || '/onboarding',
      'asg-' || new.id::text, 'project_assigned',
      jsonb_build_object('projectTitle', t.title, 'summary', t.summary, 'rate', new.agreed_rate, 'hours', t.estimated_hours, 'deadline', t.deadline));
  end if;
  return new;
end $$;
drop trigger if exists trg_assignment_created on public.assignments;
create trigger trg_assignment_created after insert on public.assignments for each row execute function public.trg_assignment_created();

create or replace function public.trg_application_event() returns trigger language plpgsql security definer set search_path = public as $$
declare t public.tasks; nm text;
begin
  select * into t from public.tasks where id = new.task_id;
  if tg_op = 'INSERT' then
    select display_name into nm from public.profiles where id = new.user_id;
    perform public.notify_admins('application', 'New application: ' || t.title, coalesce(nm, 'A tasker') || ' applied.', '/admin/applications', 'app-' || new.id::text);
  elsif new.status <> old.status and new.status = 'accepted' then
    perform public.notify(new.user_id, 'application_approved', 'Application approved: ' || t.title, 'You can start onboarding now.', '/projects', 'appok-' || new.id::text);
  elsif new.status <> old.status and new.status = 'rejected' then
    perform public.notify(new.user_id, 'application_rejected', 'Application not selected: ' || t.title, coalesce(nullif(new.reviewer_note, ''), 'The administrator chose other applicants.'), '/projects', 'appno-' || new.id::text);
  end if;
  return new;
end $$;
drop trigger if exists trg_application_event on public.applications;
create trigger trg_application_event after insert or update of status on public.applications for each row execute function public.trg_application_event();

create or replace function public.trg_submission_created() returns trigger language plpgsql security definer set search_path = public as $$
declare t public.tasks; nm text; names jsonb; payload jsonb;
begin
  select t2.* into t from public.assignments a join public.tasks t2 on t2.id = a.task_id where a.id = new.assignment_id;
  select display_name into nm from public.profiles where id = new.user_id;
  select coalesce(jsonb_agg(f->>'name'), '[]'::jsonb) into names from jsonb_array_elements(new.files) f where f->>'kind' = 'deliverable';
  payload := jsonb_build_object('projectTitle', t.title, 'taskerName', nm, 'submittedAt', new.submitted_at, 'trackedHours', round(new.tracked_seconds / 3600.0, 2),
    'deliverables', names, 'round', new.round, 'status', 'Awaiting review');
  perform public.notify(new.user_id, 'submission_received', 'Work submitted: ' || t.title, 'Your work was submitted for review.', '/projects/' || new.assignment_id::text || '/work', 'sub-' || new.id::text, 'submission_received', payload);
  perform public.notify_admins('submission', 'Work submitted: ' || t.title, coalesce(nm, 'A tasker') || ' submitted work for review.', '/admin/work', 'subadm-' || new.id::text, 'submission_admin', payload);
  return new;
end $$;
drop trigger if exists trg_submission_created on public.submissions;
create trigger trg_submission_created after insert on public.submissions for each row execute function public.trg_submission_created();

create or replace function public.trg_assignment_status() returns trigger language plpgsql security definer set search_path = public as $$
declare t public.tasks;
begin
  if new.status = old.status then return new; end if;
  select * into t from public.tasks where id = new.task_id;
  if old.status = 'submitted' and new.status = 'in_progress' then
    perform public.notify(new.user_id, 'revision_requested', 'Revisions requested: ' || t.title, new.reviewer_note, '/projects/' || new.id::text || '/work',
      'rev-' || new.id::text || '-' || extract(epoch from now())::bigint::text, 'revision_requested', jsonb_build_object('projectTitle', t.title, 'comment', new.reviewer_note));
  elsif new.status = 'rejected' then
    perform public.notify(new.user_id, 'work_rejected', 'Work not approved: ' || t.title, new.reviewer_note, '/projects/' || new.id::text || '/work',
      'rej-' || new.id::text, 'work_rejected', jsonb_build_object('projectTitle', t.title, 'comment', new.reviewer_note));
  elsif new.status = 'cancelled' then
    perform public.notify(new.user_id, 'project_cancelled', 'Project cancelled: ' || t.title, coalesce(nullif(new.reviewer_note, ''), 'An administrator cancelled this project.'), '/projects', 'cxl-' || new.id::text);
  end if;
  return new;
end $$;
drop trigger if exists trg_assignment_status on public.assignments;
create trigger trg_assignment_status after update of status on public.assignments for each row execute function public.trg_assignment_status();

-- ------------------------------------------------------------------ email sender support (service role only)
create or replace function public.claim_emails(p_limit integer default 20) returns setof public.email_outbox
language sql security definer set search_path = public as $$
  update public.email_outbox set status = 'sending', attempts = attempts + 1, updated_at = now()
  where id in (
    select id from public.email_outbox
    where ((status in ('queued','failed') and attempts < 5 and next_attempt_at <= now()) or (status = 'sending' and updated_at < now() - interval '10 minutes'))
    order by created_at limit p_limit for update skip locked)
  returning *;
$$;
revoke all on function public.claim_emails(integer) from public, anon, authenticated;
grant execute on function public.claim_emails(integer) to service_role;

-- ------------------------------------------------------------------ reminders (run by public.run_scheduled_jobs, see 006)
create or replace function public.enqueue_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; sent integer; gap integer; maxn integer; bucket bigint; why text; body text; pct integer; saved timestamptz;
begin
  gap := public.setting_int('reminder_min_gap_hours', 72); maxn := public.setting_int('reminder_max_per_project', 3);
  bucket := floor(extract(epoch from now()) / (gap * 3600));
  for r in
    select a.id, a.user_id, a.status, a.created_at, t.title, t.deadline, w.updated_at as saved_at,
      (select max(greatest(s.started_at, coalesce(s.ended_at, s.last_heartbeat))) from public.time_segments s where s.assignment_id = a.id) as last_work
    from public.assignments a join public.tasks t on t.id = a.task_id left join public.workspaces w on w.assignment_id = a.id
    where a.status in ('assigned','in_progress')
  loop
    why := null;
    if r.deadline is not null and r.deadline >= current_date and r.deadline <= current_date + public.setting_int('reminder_deadline_days', 3) then
      why := 'deadline';
    elsif r.status = 'assigned' and r.created_at < now() - make_interval(hours => public.setting_int('reminder_unstarted_hours', 48)) then
      why := 'unstarted';
    elsif r.status = 'in_progress' and greatest(coalesce(r.saved_at, 'epoch'), coalesce(r.last_work, 'epoch')) < now() - make_interval(hours => public.setting_int('reminder_inactive_hours', 96)) then
      why := 'inactive';
    end if;
    continue when why is null;
    select count(*) into sent from public.notifications where kind = 'reminder' and dedupe_key like 'rem-' || r.id::text || '-%';
    continue when sent >= maxn;
    pct := public.workspace_percent(r.id);
    body := case why when 'deadline' then 'The deadline is ' || to_char(r.deadline, 'Mon DD, YYYY') || '.' when 'unstarted' then 'This project was assigned to you but has not been started.' else 'There has been no recent activity on this project.' end;
    perform public.notify(r.user_id, 'reminder', 'Reminder: ' || r.title, body, '/projects/' || r.id::text || '/work', 'rem-' || r.id::text || '-' || why || '-' || bucket::text, 'reminder',
      jsonb_build_object('projectTitle', r.title, 'status', r.status, 'reason', why, 'deadline', r.deadline, 'remainingDays', case when r.deadline is null then null else (r.deadline - current_date) end,
        'lastSaved', r.saved_at, 'progressPercent', pct));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.enqueue_reminders() from public, anon, authenticated;

do $$ declare f text; begin
  foreach f in array array['mark_notifications_read(uuid[])'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function public.notify(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.queue_email(uuid, text, text, text, jsonb, text, text) from public, anon, authenticated;

notify pgrst, 'reload schema';
