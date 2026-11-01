-- Account approval, assignments, server-side timer, approved-hours payments, and
-- encrypted US bank accounts. Run AFTER schema.sql and 002_work_and_payments.sql.
-- Safe to re-run, EXCEPT it refuses to run if public.payments already holds rows
-- (it replaces the old work-submission payments with assignment-based ones).
--
-- BEFORE using bank accounts, create the encryption key once in the SQL editor:
--   select vault.create_secret('<a long random string>', 'payout_encryption_key');
-- Keep a copy of that string somewhere safe: without it stored bank data cannot be decrypted.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- replace old payment model
do $$ declare n int; begin
  if to_regclass('public.payments') is not null then
    execute 'select count(*) from public.payments' into n;
    if n > 0 and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'payments' and column_name = 'seconds') then
      raise exception 'public.payments has rows from the old model; migrate them manually first';
    end if;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'payments' and column_name = 'seconds') then
    drop table if exists public.payments cascade;
  end if;
end $$;
drop table if exists public.work_submissions cascade;
drop function if exists public.create_payment_for_approved_work();
drop function if exists public.guard_submission_update();

-- ---------------------------------------------------------------- account approval + immutable name
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'account_status') then
    alter table public.profiles add column account_status text not null default 'pending' check (account_status in ('pending','approved','rejected'));
    update public.profiles set account_status = 'approved';   -- existing accounts keep their access
  end if;
end $$;
alter table public.profiles add column if not exists review_note text not null default '';
alter table public.profiles add column if not exists reviewed_at timestamptz;
alter table public.profiles add column if not exists reviewed_by uuid references auth.users(id);
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email, account_status)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
          new.email, 'pending')
  on conflict (id) do nothing;
  return new;
end $$;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and account_status = 'approved');
$$;

-- Only admins may change profiles; taskers cannot edit their registered name, status or role.
create or replace function public.guard_profile_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('anon','authenticated') then
    if not public.is_admin() then raise exception 'Profiles cannot be edited'; end if;
    if new.id <> old.id then raise exception 'Profile ids cannot change'; end if;
    if new.account_status <> old.account_status then new.reviewed_at := now(); new.reviewed_by := auth.uid(); end if;
  end if;
  return new;
end $$;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- tasks: onboarding content + approved-only access
alter table public.tasks add column if not exists objectives text[] not null default '{}';
alter table public.tasks add column if not exists instructions text;
alter table public.tasks add column if not exists guidelines text[] not null default '{}';

drop policy if exists "applications insert own" on public.applications;
create policy "applications insert own" on public.applications for insert to authenticated
  with check (user_id = auth.uid() and status = 'submitted' and reviewer_note = '' and public.is_approved()
    and exists (select 1 from public.tasks t where t.id = task_id and t.status = 'published' and (t.deadline is null or t.deadline >= current_date)));

-- ---------------------------------------------------------------- assignments
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  source text not null check (source in ('assigned','application')),
  status text not null default 'assigned' check (status in ('assigned','in_progress','submitted','completed','cancelled')),
  agreed_rate numeric(6,2) not null check (agreed_rate between 10 and 200),
  onboarded_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  submission_note text not null default '',
  submission_link text check (submission_link is null or submission_link ~* '^https?://'),
  reviewer_note text not null default '',
  approved_seconds integer check (approved_seconds >= 0),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (task_id, user_id)
);
create index if not exists assignments_user_idx on public.assignments(user_id, status);

create table if not exists public.time_segments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);
-- One running timer per tasker, enforced by the database itself.
create unique index if not exists one_open_segment_per_user on public.time_segments(user_id) where ended_at is null;
create index if not exists segments_assignment_idx on public.time_segments(assignment_id);

alter table public.assignments enable row level security;
alter table public.time_segments enable row level security;
drop policy if exists "assignments read own or admin" on public.assignments;
create policy "assignments read own or admin" on public.assignments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "segments read own or admin" on public.time_segments;
create policy "segments read own or admin" on public.time_segments for select using (user_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies: every change goes through the functions below,
-- which stamp times with the database clock.

drop policy if exists "tasks read published" on public.tasks;
create policy "tasks read published" on public.tasks for select using (
  public.is_admin()
  or (status = 'published' and public.is_approved())
  or exists (select 1 from public.assignments a where a.task_id = tasks.id and a.user_id = auth.uid()));
drop policy if exists "categories read" on public.categories;
create policy "categories read" on public.categories for select using (public.is_approved() or public.is_admin());


-- Existing accepted applications become assignments.
insert into public.assignments (task_id, user_id, application_id, source, agreed_rate)
select a.task_id, a.user_id, a.id, 'application', coalesce(a.agreed_rate, a.proposed_rate, t.hourly_rate)
from public.applications a join public.tasks t on t.id = a.task_id where a.status = 'accepted'
on conflict (task_id, user_id) do nothing;

create or replace function public.create_assignment_on_accept() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.assignments (task_id, user_id, application_id, source, agreed_rate)
    select new.task_id, new.user_id, new.id, 'application', coalesce(new.agreed_rate, new.proposed_rate, t.hourly_rate)
    from public.tasks t where t.id = new.task_id
    on conflict (task_id, user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists create_assignment_on_accept on public.applications;
create trigger create_assignment_on_accept after update on public.applications
  for each row execute function public.create_assignment_on_accept();

-- ---------------------------------------------------------------- timer + workflow functions
create or replace function public.tracked_seconds(p_assignment uuid) returns integer
language sql stable security definer set search_path = public as $$
  -- Each running or finished segment counts at most 12 hours, so a forgotten timer cannot inflate pay.
  select coalesce(floor(sum(extract(epoch from (least(coalesce(s.ended_at, now()), s.started_at + interval '12 hours') - s.started_at)))), 0)::integer
  from public.time_segments s join public.assignments a on a.id = s.assignment_id
  where s.assignment_id = p_assignment and (a.user_id = auth.uid() or public.is_admin());
$$;

create or replace function public.timer_state(p_assignment uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare a public.assignments;
begin
  select * into a from public.assignments where id = p_assignment and (user_id = auth.uid() or public.is_admin());
  if not found then raise exception 'Project not found'; end if;
  return json_build_object('trackedSeconds', public.tracked_seconds(p_assignment),
    'running', exists (select 1 from public.time_segments where assignment_id = p_assignment and ended_at is null),
    'status', a.status, 'serverTime', now());
end $$;

create or replace function public.active_timer() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('assignmentId', s.assignment_id, 'taskTitle', t.title,
    'trackedSeconds', public.tracked_seconds(s.assignment_id), 'serverTime', now())
  from public.time_segments s join public.assignments a on a.id = s.assignment_id join public.tasks t on t.id = a.task_id
  where s.user_id = auth.uid() and s.ended_at is null limit 1;
$$;

create or replace function public.ack_onboarding(p_assignment uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_approved() then raise exception 'Your account is not approved'; end if;
  update public.assignments set onboarded_at = coalesce(onboarded_at, now())
    where id = p_assignment and user_id = auth.uid() and status in ('assigned','in_progress');
  if not found then raise exception 'Project not found or not open for work'; end if;
end $$;

create or replace function public.start_work(p_assignment uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.assignments;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not public.is_approved() then raise exception 'Your account is not approved'; end if;
  select * into a from public.assignments where id = p_assignment and user_id = auth.uid() for update;
  if not found then raise exception 'Project not found'; end if;
  if a.status not in ('assigned','in_progress') then raise exception 'This project is % and cannot be worked on', a.status; end if;
  if a.onboarded_at is null then raise exception 'Complete onboarding before starting work'; end if;
  if exists (select 1 from public.time_segments where user_id = auth.uid() and ended_at is null) then
    raise exception 'A timer is already running. Pause it before starting another.';
  end if;
  insert into public.time_segments (assignment_id, user_id) values (p_assignment, auth.uid());
  update public.assignments set status = 'in_progress', started_at = coalesce(started_at, now()) where id = p_assignment;
  return public.timer_state(p_assignment);
end $$;

create or replace function public.pause_work(p_assignment uuid) returns json
language plpgsql security definer set search_path = public as $$
begin
  update public.time_segments set ended_at = least(now(), started_at + interval '12 hours')
    where assignment_id = p_assignment and user_id = auth.uid() and ended_at is null;
  if not found then raise exception 'No timer is running for this project'; end if;
  return public.timer_state(p_assignment);
end $$;

create or replace function public.submit_work(p_assignment uuid, p_note text, p_link text) returns json
language plpgsql security definer set search_path = public as $$
declare a public.assignments;
begin
  select * into a from public.assignments where id = p_assignment and user_id = auth.uid() for update;
  if not found then raise exception 'Project not found'; end if;
  if a.status <> 'in_progress' then raise exception 'Only a project in progress can be submitted'; end if;
  if char_length(coalesce(p_note, '')) < 20 or char_length(p_note) > 2000 then raise exception 'Describe your work in 20 to 2000 characters'; end if;
  if p_link is not null and p_link <> '' and p_link !~* '^https?://' then raise exception 'The deliverables link must start with http:// or https://'; end if;
  update public.time_segments set ended_at = least(now(), started_at + interval '12 hours')
    where assignment_id = p_assignment and user_id = auth.uid() and ended_at is null;
  if public.tracked_seconds(p_assignment) < 60 then raise exception 'Track at least one minute of work before submitting'; end if;
  update public.assignments set status = 'submitted', submitted_at = now(), submission_note = p_note,
    submission_link = nullif(p_link, ''), reviewer_note = '' where id = p_assignment;
  return public.timer_state(p_assignment);
end $$;

create or replace function public.assign_task(p_user uuid, p_task text, p_rate numeric default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare t public.tasks; r numeric; new_id uuid;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if not exists (select 1 from public.profiles where id = p_user and account_status = 'approved') then raise exception 'The tasker account is not approved'; end if;
  select * into t from public.tasks where id = p_task;
  if not found or t.status = 'archived' then raise exception 'Project not found or archived'; end if;
  r := coalesce(p_rate, t.hourly_rate);
  if r < 10 or r > 200 then raise exception 'The hourly rate must be between 10 and 200'; end if;
  if exists (select 1 from public.assignments where task_id = p_task and user_id = p_user) then raise exception 'This tasker already has this project'; end if;
  insert into public.assignments (task_id, user_id, source, agreed_rate) values (p_task, p_user, 'assigned', r) returning id into new_id;
  return new_id;
end $$;

create or replace function public.cancel_assignment(p_assignment uuid, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  update public.time_segments set ended_at = least(now(), started_at + interval '12 hours') where assignment_id = p_assignment and ended_at is null;
  update public.assignments set status = 'cancelled', reviewer_note = coalesce(p_note, '') where id = p_assignment and status not in ('completed','cancelled');
  if not found then raise exception 'Only an open project can be cancelled'; end if;
end $$;

create or replace function public.request_changes(p_assignment uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if char_length(coalesce(p_note, '')) < 3 then raise exception 'Explain what needs to change'; end if;
  update public.assignments set status = 'in_progress', reviewer_note = p_note where id = p_assignment and status = 'submitted';
  if not found then raise exception 'Only submitted work can be sent back'; end if;
end $$;

-- ---------------------------------------------------------------- payments (hours x agreed rate)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seconds integer not null check (seconds >= 0),
  hourly_rate numeric(6,2) not null,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  reference text not null default '',
  note text not null default '',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id);
alter table public.payments enable row level security;
drop policy if exists "payments read own or admin" on public.payments;
create policy "payments read own or admin" on public.payments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "payments admin update" on public.payments;
create policy "payments admin update" on public.payments for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.approve_work(p_assignment uuid, p_seconds integer, p_note text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare a public.assignments; tracked integer; pay_id uuid;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  select * into a from public.assignments where id = p_assignment for update;
  if not found or a.status <> 'submitted' then raise exception 'Only submitted work can be approved'; end if;
  tracked := public.tracked_seconds(p_assignment);
  if p_seconds is null or p_seconds < 0 or p_seconds > tracked then raise exception 'Approved time must be between 0 and the tracked % seconds', tracked; end if;
  update public.assignments set status = 'completed', completed_at = now(), approved_seconds = p_seconds, reviewer_note = coalesce(p_note, '') where id = p_assignment;
  insert into public.payments (assignment_id, user_id, seconds, hourly_rate, amount)
    values (p_assignment, a.user_id, p_seconds, a.agreed_rate, round(p_seconds * a.agreed_rate / 3600.0, 2)) returning id into pay_id;
  return pay_id;
end $$;

-- ---------------------------------------------------------------- US bank accounts (encrypted, never readable by the browser)
create table if not exists public.payout_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_holder text not null,
  bank_name text not null,
  account_type text not null check (account_type in ('checking','savings')),
  routing_last4 text not null,
  account_last4 text not null,
  secret bytea not null,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id)
);
create table if not exists public.payout_access_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id),
  user_id uuid not null,
  at timestamptz not null default now()
);
alter table public.payout_accounts enable row level security;
alter table public.payout_access_log enable row level security;
drop policy if exists "payout read own or admin" on public.payout_accounts;
create policy "payout read own or admin" on public.payout_accounts for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "payout log admin read" on public.payout_access_log;
create policy "payout log admin read" on public.payout_access_log for select using (public.is_admin());
-- The encrypted column is not selectable by app users at all; only these columns are.
revoke all on public.payout_accounts from anon, authenticated;
grant select (user_id, account_holder, bank_name, account_type, routing_last4, account_last4, status, review_note, created_at, updated_at, verified_at)
  on public.payout_accounts to authenticated;
revoke all on public.payout_access_log from anon, authenticated;
grant select on public.payout_access_log to authenticated;

create or replace function public.aba_valid(r text) returns boolean language sql immutable as $$
  select r ~ '^[0-9]{9}$' and (
    3 * (substr(r,1,1)::int + substr(r,4,1)::int + substr(r,7,1)::int) +
    7 * (substr(r,2,1)::int + substr(r,5,1)::int + substr(r,8,1)::int) +
        (substr(r,3,1)::int + substr(r,6,1)::int + substr(r,9,1)::int)) % 10 = 0;
$$;

create or replace function public.save_payout_account(p_holder text, p_bank text, p_type text, p_routing text, p_account text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare k text; enc bytea;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not public.is_approved() then raise exception 'Your account is not approved'; end if;
  if char_length(trim(coalesce(p_holder, ''))) < 2 or char_length(p_holder) > 100 then raise exception 'Enter the account holder name'; end if;
  if char_length(trim(coalesce(p_bank, ''))) < 2 or char_length(p_bank) > 100 then raise exception 'Enter the bank name'; end if;
  if p_type not in ('checking','savings') then raise exception 'Choose checking or savings'; end if;
  if not public.aba_valid(coalesce(p_routing, '')) then raise exception 'Enter a valid 9-digit US routing number'; end if;
  if coalesce(p_account, '') !~ '^[0-9]{4,17}$' then raise exception 'Account numbers are 4 to 17 digits'; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'payout_encryption_key';
  if k is null then raise exception 'Bank account storage is not configured yet. An administrator must add the payout_encryption_key secret in Supabase Vault.'; end if;
  enc := extensions.pgp_sym_encrypt(json_build_object('routing', p_routing, 'account', p_account)::text, k);
  insert into public.payout_accounts (user_id, account_holder, bank_name, account_type, routing_last4, account_last4, secret)
    values (auth.uid(), trim(p_holder), trim(p_bank), p_type, right(p_routing, 4), right(p_account, 4), enc)
  on conflict (user_id) do update set account_holder = excluded.account_holder, bank_name = excluded.bank_name, account_type = excluded.account_type,
    routing_last4 = excluded.routing_last4, account_last4 = excluded.account_last4, secret = excluded.secret,
    status = 'pending', review_note = '', verified_at = null, verified_by = null, updated_at = now();
  return json_build_object('status', 'pending', 'accountLast4', right(p_account, 4));
end $$;

create or replace function public.review_payout_account(p_user uuid, p_status text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if p_status not in ('verified','rejected') then raise exception 'Invalid status'; end if;
  update public.payout_accounts set status = p_status, review_note = coalesce(p_note, ''), updated_at = now(),
    verified_at = case when p_status = 'verified' then now() end, verified_by = auth.uid() where user_id = p_user;
  if not found then raise exception 'No payment account found'; end if;
end $$;

-- Admin-only, logged: needed to actually send an ACH transfer outside this app.
create or replace function public.reveal_payout_account(p_user uuid) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare k text; a public.payout_accounts; j json;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  select * into a from public.payout_accounts where user_id = p_user;
  if not found then raise exception 'No payment account found'; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'payout_encryption_key';
  if k is null then raise exception 'The encryption key is not configured'; end if;
  j := extensions.pgp_sym_decrypt(a.secret, k)::json;
  insert into public.payout_access_log (admin_id, user_id) values (auth.uid(), p_user);
  return json_build_object('holder', a.account_holder, 'bank', a.bank_name, 'type', a.account_type, 'routing', j->>'routing', 'account', j->>'account');
end $$;

-- Payments: amounts frozen, strict status order, and payout needs a verified bank account.
create or replace function public.guard_payment_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.amount <> old.amount or new.seconds <> old.seconds or new.hourly_rate <> old.hourly_rate
     or new.user_id <> old.user_id or new.assignment_id <> old.assignment_id then
    raise exception 'Payment amounts cannot be changed';
  end if;
  if new.status <> old.status then
    if not ((old.status = 'pending' and new.status in ('approved','rejected')) or (old.status = 'approved' and new.status = 'paid')) then
      raise exception 'Invalid payment status change: % to %', old.status, new.status;
    end if;
    if new.status = 'approved' then new.approved_by := coalesce(auth.uid(), new.approved_by); new.approved_at := now(); end if;
    if new.status = 'paid' then
      if char_length(trim(new.reference)) = 0 then raise exception 'A payment reference is required to mark a payment as paid'; end if;
      if not exists (select 1 from public.payout_accounts where user_id = new.user_id and status = 'verified') then
        raise exception 'The tasker has no verified payment account';
      end if;
      new.paid_at := now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_payment_update on public.payments;
create trigger guard_payment_update before update on public.payments
  for each row execute function public.guard_payment_update();

-- ---------------------------------------------------------------- tax information (last 4 digits only)
create table if not exists public.tax_forms (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  form_type text not null check (form_type in ('w9','general')),
  legal_name text not null check (char_length(legal_name) between 2 and 120),
  classification text not null,
  tin_last4 text not null check (tin_last4 ~ '^[A-Za-z0-9]{4}$'),
  certified boolean not null check (certified),
  submitted_at timestamptz not null default now()
);
alter table public.tax_forms enable row level security;
drop policy if exists "tax read own or admin" on public.tax_forms;
create policy "tax read own or admin" on public.tax_forms for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "tax insert own" on public.tax_forms;
create policy "tax insert own" on public.tax_forms for insert to authenticated with check (user_id = auth.uid() and public.is_approved());
drop policy if exists "tax update own" on public.tax_forms;
create policy "tax update own" on public.tax_forms for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- public numbers for the landing page (counts only)
create or replace function public.public_stats() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('tasks', count(*), 'categories', count(distinct category_id), 'minRate', min(hourly_rate), 'maxRate', max(hourly_rate))
  from public.tasks where status = 'published' and (deadline is null or deadline >= current_date);
$$;

-- ---------------------------------------------------------------- function permissions
do $$ declare f text; begin
  foreach f in array array[
    'tracked_seconds(uuid)','timer_state(uuid)','active_timer()','ack_onboarding(uuid)','start_work(uuid)','pause_work(uuid)',
    'submit_work(uuid,text,text)','assign_task(uuid,text,numeric)','cancel_assignment(uuid,text)','request_changes(uuid,text)',
    'approve_work(uuid,integer,text)','save_payout_account(text,text,text,text,text)','review_payout_account(uuid,text,text)','reveal_payout_account(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
grant execute on function public.public_stats() to anon, authenticated;

notify pgrst, 'reload schema';
