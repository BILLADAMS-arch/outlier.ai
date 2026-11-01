-- Earnings statements, monthly payment cycles (last Tuesday), payment lifecycle, audited adjustments,
-- AirTM payout accounts, scheduled jobs. Run AFTER 005_notifications_email.sql. Safe to re-run.
--
-- Definitions used everywhere (all USD, rounded to cents, computed here on the server):
--   Tracked   = recorded working time x the assignment's agreed hourly rate (rate is frozen per assignment)
--   Pending   = submitted work awaiting review, plus payments awaiting payment approval
--   Approved  = payments approved for payment but not yet paid (approved / processing / failed)
--   Paid      = payments an administrator recorded as completed with a transfer reference
-- Reporting weeks run Monday to Sunday in UTC. A payment is allocated to weeks in proportion to the time worked in each.

insert into public.app_settings (key, value) values
  ('cutoff_days_before_payment', '7'),              -- work approved after this cutoff goes into the next cycle
  ('approval_deadline_days_before_payment', '3')    -- payments must be approved this many days before the payment date
on conflict (key) do nothing;

-- ------------------------------------------------------------------ payout methods: US bank or US AirTM
alter table public.payout_accounts add column if not exists method text not null default 'bank' check (method in ('bank','airtm'));
alter table public.payout_accounts add column if not exists display_mask text;
alter table public.payout_accounts alter column account_type drop not null;
alter table public.payout_accounts alter column routing_last4 drop not null;
alter table public.payout_accounts alter column account_last4 drop not null;
grant select (method, display_mask) on public.payout_accounts to authenticated;

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
  if k is null then raise exception 'Payment account storage is not configured yet. An administrator must add the payout_encryption_key secret in Supabase Vault.'; end if;
  enc := extensions.pgp_sym_encrypt(json_build_object('routing', p_routing, 'account', p_account)::text, k);
  insert into public.payout_accounts (user_id, method, account_holder, bank_name, account_type, routing_last4, account_last4, display_mask, secret)
    values (auth.uid(), 'bank', trim(p_holder), trim(p_bank), p_type, right(p_routing, 4), right(p_account, 4), null, enc)
  on conflict (user_id) do update set method = 'bank', account_holder = excluded.account_holder, bank_name = excluded.bank_name, account_type = excluded.account_type,
    routing_last4 = excluded.routing_last4, account_last4 = excluded.account_last4, display_mask = null, secret = excluded.secret,
    status = 'pending', review_note = '', verified_at = null, verified_by = null, updated_at = now();
  return json_build_object('status', 'pending', 'method', 'bank');
end $$;

create or replace function public.save_airtm_account(p_name text, p_email text, p_us_confirmed boolean) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare k text; enc bytea; mask text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not public.is_approved() then raise exception 'Your account is not approved'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 or char_length(p_name) > 100 then raise exception 'Enter the account holder name'; end if;
  if coalesce(p_email, '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Enter the email address of your AirTM account'; end if;
  if not coalesce(p_us_confirmed, false) then raise exception 'Only eligible United States AirTM accounts can receive payments'; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'payout_encryption_key';
  if k is null then raise exception 'Payment account storage is not configured yet. An administrator must add the payout_encryption_key secret in Supabase Vault.'; end if;
  enc := extensions.pgp_sym_encrypt(json_build_object('email', lower(trim(p_email)))::text, k);
  mask := left(trim(p_email), 1) || '***@' || split_part(trim(p_email), '@', 2);
  insert into public.payout_accounts (user_id, method, account_holder, bank_name, account_type, routing_last4, account_last4, display_mask, secret)
    values (auth.uid(), 'airtm', trim(p_name), 'AirTM', null, null, null, mask, enc)
  on conflict (user_id) do update set method = 'airtm', account_holder = excluded.account_holder, bank_name = 'AirTM', account_type = null,
    routing_last4 = null, account_last4 = null, display_mask = excluded.display_mask, secret = excluded.secret,
    status = 'pending', review_note = '', verified_at = null, verified_by = null, updated_at = now();
  return json_build_object('status', 'pending', 'method', 'airtm', 'mask', mask);
end $$;

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
  return json_build_object('method', a.method, 'holder', a.account_holder, 'bank', a.bank_name, 'type', a.account_type,
    'routing', j->>'routing', 'account', j->>'account', 'email', j->>'email');
end $$;

-- ------------------------------------------------------------------ payment cycles
create or replace function public.last_tuesday(p_month date) returns date language sql immutable as $$
  select (d - ((extract(isodow from d)::integer - 2 + 7) % 7))::date
  from (select (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date as d) x;
$$;

-- The payment date an amount joins when work is approved on p_date: this month's last Tuesday if p_date is on or
-- before that cycle's earnings cutoff, otherwise next month's (so year boundaries roll over automatically).
create or replace function public.payment_cycle_for(p_date date) returns date language sql stable set search_path = public as $$
  select case when p_date <= public.last_tuesday(p_date) - public.setting_int('cutoff_days_before_payment', 7)
              then public.last_tuesday(p_date)
              else public.last_tuesday((date_trunc('month', p_date) + interval '1 month')::date) end;
$$;

create or replace function public.next_cycle(p_pay date) returns date language sql immutable as $$
  select public.last_tuesday((date_trunc('month', p_pay) + interval '1 month')::date);
$$;

-- ------------------------------------------------------------------ payments: lifecycle, references, audit
alter table public.payments add column if not exists payment_ref text;
update public.payments set payment_ref = 'PAY-' || to_char(created_at, 'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)) where payment_ref is null;
alter table public.payments alter column payment_ref set default ('PAY-' || to_char(now(), 'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)));
alter table public.payments alter column payment_ref set not null;
create unique index if not exists payments_ref_idx on public.payments(payment_ref);
alter table public.payments add column if not exists method text;
alter table public.payments add column if not exists cycle_date date;
alter table public.payments add column if not exists carried_forward boolean not null default false;
alter table public.payments add column if not exists failure_reason text not null default '';
alter table public.payments add column if not exists processed_at timestamptz;
update public.payments set cycle_date = public.payment_cycle_for(created_at::date) where cycle_date is null;
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'payments_status_check') then alter table public.payments drop constraint payments_status_check; end if;
  alter table public.payments add constraint payments_status_check check (status in ('pending','approved','processing','paid','failed','rejected'));
end $$;

create table if not exists public.earnings_adjustments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  admin_id uuid not null references auth.users(id) default auth.uid(),
  original_seconds integer not null, adjusted_seconds integer not null,
  original_amount numeric(10,2) not null, adjusted_amount numeric(10,2) not null,
  reason text not null check (char_length(reason) >= 3),
  created_at timestamptz not null default now()
);
alter table public.earnings_adjustments enable row level security;
drop policy if exists "adjustments admin read" on public.earnings_adjustments;
create policy "adjustments admin read" on public.earnings_adjustments for select using (public.is_admin());

create or replace function public.trg_payment_defaults() returns trigger language plpgsql set search_path = public as $$
begin
  new.cycle_date := coalesce(new.cycle_date, public.payment_cycle_for(current_date));
  return new;
end $$;
drop trigger if exists trg_payment_defaults on public.payments;
create trigger trg_payment_defaults before insert on public.payments for each row execute function public.trg_payment_defaults();

create or replace function public.guard_payment_update() returns trigger language plpgsql set search_path = public as $$
declare adj boolean := coalesce(current_setting('app.payment_adjust', true), '') = '1';
begin
  if (new.amount <> old.amount or new.seconds <> old.seconds) and not (adj and old.status = 'pending') then
    raise exception 'Payment amounts cannot be changed';
  end if;
  if new.hourly_rate <> old.hourly_rate or new.user_id <> old.user_id or new.assignment_id <> old.assignment_id or new.payment_ref <> old.payment_ref then
    raise exception 'Payment details cannot be changed';
  end if;
  if new.status <> old.status then
    if not ((old.status = 'pending' and new.status in ('approved','rejected'))
         or (old.status = 'approved' and new.status = 'processing')
         or (old.status = 'processing' and new.status in ('paid','failed'))
         or (old.status = 'failed' and new.status = 'processing')) then
      raise exception 'Invalid payment status change: % to %', old.status, new.status;
    end if;
    if new.status = 'approved' then
      new.approved_by := coalesce(auth.uid(), new.approved_by); new.approved_at := now();
      -- Approved after the cycle's approval deadline: carry it into the next payment cycle.
      while current_date > new.cycle_date - public.setting_int('approval_deadline_days_before_payment', 3) loop
        new.cycle_date := public.next_cycle(new.cycle_date); new.carried_forward := true;
      end loop;
      select method into new.method from public.payout_accounts where user_id = new.user_id;
    elsif new.status = 'processing' then
      new.processed_at := now(); new.failure_reason := '';
    elsif new.status = 'paid' then
      if char_length(trim(new.reference)) < 3 then raise exception 'A transfer reference is required to record a payment as completed'; end if;
      if not exists (select 1 from public.payout_accounts where user_id = new.user_id and status = 'verified') then
        raise exception 'The tasker has no verified payment account';
      end if;
      new.paid_at := now();
    elsif new.status = 'failed' then
      if char_length(trim(new.failure_reason)) < 3 then raise exception 'Record why the payment failed'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_payment_update on public.payments;
create trigger guard_payment_update before update on public.payments for each row execute function public.guard_payment_update();

-- Payment events -> in-app notifications and (queued, de-duplicated) emails, only after the real change committed.
create or replace function public.trg_payment_event() returns trigger language plpgsql security definer set search_path = public as $$
declare t public.tasks; nm text; base jsonb; lbl text;
begin
  select t2.* into t from public.assignments a join public.tasks t2 on t2.id = a.task_id where a.id = new.assignment_id;
  select display_name into nm from public.profiles where id = new.user_id;
  lbl := case coalesce(new.method, (select method from public.payout_accounts where user_id = new.user_id)) when 'airtm' then 'AirTM (United States)' when 'bank' then 'US bank account' else 'Not set up yet' end;
  base := jsonb_build_object('projectTitle', t.title, 'reference', new.payment_ref, 'amount', new.amount, 'hours', round(new.seconds / 3600.0, 2), 'rate', new.hourly_rate,
    'method', lbl, 'paymentDate', new.cycle_date, 'carried', new.carried_forward);
  if tg_op = 'INSERT' then
    perform public.notify(new.user_id, 'work_approved', 'Work approved: ' || t.title, 'Your work was approved. Earnings: $' || new.amount::text || '. Payment approval comes next.', '/earnings',
      'wok-' || new.id::text, 'work_approved', base || jsonb_build_object('approvedHours', round(new.seconds / 3600.0, 2), 'status', 'Awaiting payment approval'));
    perform public.notify_admins('payment_request', 'Payment awaiting approval', coalesce(nm, 'A tasker') || ': $' || new.amount::text, '/admin/payments', 'preq-' || new.id::text);
  elsif new.status <> old.status then
    if new.status = 'approved' then
      perform public.notify(new.user_id, 'payment_approved', 'Payment approved: $' || new.amount::text, 'Scheduled for ' || to_char(new.cycle_date, 'Mon DD, YYYY') || '. Approved is not the same as paid.', '/earnings',
        'pay-' || new.id::text || '-approved-' || extract(epoch from now())::bigint::text, 'payment_approved', base || jsonb_build_object('status', 'Approved for payment'));
      if new.carried_forward and not old.carried_forward then
        perform public.notify(new.user_id, 'payment_carried', 'Earnings carried to the next payment cycle', 'This payment was approved after the cycle deadline and moved to ' || to_char(new.cycle_date, 'Mon DD, YYYY') || '.', '/earnings',
          'pay-' || new.id::text || '-carried-' || extract(epoch from now())::bigint::text, 'payment_carried', base || jsonb_build_object('status', 'Carried forward'));
      end if;
    elsif new.status = 'processing' then
      perform public.notify(new.user_id, 'payment_processing', 'Payment processing: $' || new.amount::text, 'Your payment is being processed. It is not completed yet.', '/earnings',
        'pay-' || new.id::text || '-processing-' || extract(epoch from now())::bigint::text, 'payment_processing', base || jsonb_build_object('status', 'Processing'));
    elsif new.status = 'paid' then
      perform public.notify(new.user_id, 'payment_completed', 'Payment completed: $' || new.amount::text, 'Your payment was sent. Reference: ' || new.reference, '/earnings',
        'pay-' || new.id::text || '-paid', 'payment_completed', base || jsonb_build_object('status', 'Paid', 'transferReference', new.reference));
    elsif new.status = 'failed' then
      perform public.notify(new.user_id, 'payment_failed', 'Payment failed: $' || new.amount::text, new.failure_reason, '/payout',
        'pay-' || new.id::text || '-failed-' || extract(epoch from now())::bigint::text, 'payment_failed', base || jsonb_build_object('status', 'Failed', 'reason', new.failure_reason));
    elsif new.status = 'rejected' then
      perform public.notify(new.user_id, 'payment_rejected', 'Payment not approved', coalesce(nullif(new.note, ''), 'An administrator did not approve this payment.'), '/earnings', 'pay-' || new.id::text || '-rejected');
    end if;
  elsif new.cycle_date <> old.cycle_date and new.carried_forward then
    perform public.notify(new.user_id, 'payment_carried', 'Earnings carried to the next payment cycle', 'This payment moved to ' || to_char(new.cycle_date, 'Mon DD, YYYY') || '.', '/earnings',
      'pay-' || new.id::text || '-carried-' || new.cycle_date::text, 'payment_carried', base || jsonb_build_object('status', 'Carried forward'));
  end if;
  return new;
end $$;
drop trigger if exists trg_payment_event on public.payments;
create trigger trg_payment_event after insert or update on public.payments for each row execute function public.trg_payment_event();

-- ------------------------------------------------------------------ administrator payment operations
create or replace function public.adjust_payment(p_payment uuid, p_seconds integer, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare p public.payments; new_amount numeric;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if char_length(coalesce(p_reason, '')) < 3 then raise exception 'A reason is required for every adjustment'; end if;
  select * into p from public.payments where id = p_payment for update;
  if not found or p.status <> 'pending' then raise exception 'Only a payment awaiting approval can be adjusted'; end if;
  if p_seconds is null or p_seconds < 0 or p_seconds > 3600 * 500 then raise exception 'Enter a valid number of seconds'; end if;
  new_amount := round(p_seconds * p.hourly_rate / 3600.0, 2);
  insert into public.earnings_adjustments (payment_id, original_seconds, adjusted_seconds, original_amount, adjusted_amount, reason)
    values (p.id, p.seconds, p_seconds, p.amount, new_amount, p_reason);
  perform set_config('app.payment_adjust', '1', true);
  update public.payments set seconds = p_seconds, amount = new_amount where id = p.id;
  update public.assignments set approved_seconds = p_seconds where id = p.assignment_id;
  perform set_config('app.payment_adjust', '', true);
end $$;

create or replace function public.approve_payment_batch(p_cycle date) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  update public.payments set status = 'approved' where status = 'pending' and cycle_date = p_cycle;
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.start_processing_batch(p_cycle date) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  update public.payments set status = 'processing' where status = 'approved' and cycle_date = p_cycle;
  get diagnostics n = row_count; return n;
end $$;

-- Move everything not yet paid in a cycle to the next one and tell the taskers.
create or replace function public.carry_forward_cycle(p_cycle date) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  update public.payments set cycle_date = public.next_cycle(p_cycle), carried_forward = true
    where cycle_date = p_cycle and status in ('approved','processing','failed');
  get diagnostics n = row_count; return n;
end $$;

-- ------------------------------------------------------------------ earnings calculations (server side)
create or replace function public._earnings_rows(uid uuid, p_from date, p_to date, p_bucket text)
returns table (bucket date, assignment_id uuid, user_id uuid, user_name text, task_title text, rate numeric, seconds integer,
               tracked_amount numeric, pending_amount numeric, approved_amount numeric, paid_amount numeric, payment_status text, cycle_date date)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_bucket not in ('day','week','month','year') then raise exception 'Invalid bucket'; end if;
  return query
  with seg as (
    select s.assignment_id as aid, date_trunc(p_bucket, s.started_at at time zone 'UTC')::date as b, sum(public.seg_seconds(s))::integer as secs
    from public.time_segments s
    where (s.started_at at time zone 'UTC')::date between p_from and p_to
    group by 1, 2
  ), tot as (
    select s.assignment_id as aid, sum(public.seg_seconds(s))::integer as total from public.time_segments s group by 1
  )
  select seg.b, a.id, a.user_id, pr.display_name, t.title, a.agreed_rate, seg.secs,
    round(seg.secs * a.agreed_rate / 3600.0, 2),
    case when a.status = 'submitted' then round(seg.secs * a.agreed_rate / 3600.0, 2)
         when p.status = 'pending' then round(p.amount * seg.secs / nullif(tot.total, 0), 2) else 0::numeric end,
    case when p.status in ('approved','processing','failed') then round(p.amount * seg.secs / nullif(tot.total, 0), 2) else 0::numeric end,
    case when p.status = 'paid' then round(p.amount * seg.secs / nullif(tot.total, 0), 2) else 0::numeric end,
    p.status, p.cycle_date
  from seg join public.assignments a on a.id = seg.aid join tot on tot.aid = seg.aid
    join public.tasks t on t.id = a.task_id join public.profiles pr on pr.id = a.user_id
    left join public.payments p on p.assignment_id = a.id
  where (uid is null or a.user_id = uid) and a.status <> 'cancelled'
  order by seg.b, t.title;
end $$;
revoke all on function public._earnings_rows(uuid, date, date, text) from public, anon, authenticated;

create or replace function public.earnings_rows(p_user uuid, p_from date, p_to date, p_bucket text default 'week')
returns table (bucket date, assignment_id uuid, user_id uuid, user_name text, task_title text, rate numeric, seconds integer,
               tracked_amount numeric, pending_amount numeric, approved_amount numeric, paid_amount numeric, payment_status text, cycle_date date)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  return query select * from public._earnings_rows(case when public.is_admin() then p_user else auth.uid() end, p_from, p_to, p_bucket);
end $$;

create or replace function public._payment_calendar(uid uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare pay date; cut date; dl date; approved numeric; pend numeric; carried numeric; st text; processing integer;
begin
  pay := public.last_tuesday(current_date);
  if current_date > pay then pay := public.next_cycle(pay); end if;
  cut := pay - public.setting_int('cutoff_days_before_payment', 7);
  dl := pay - public.setting_int('approval_deadline_days_before_payment', 3);
  select coalesce(sum(amount) filter (where status in ('approved','processing','failed','paid')), 0), coalesce(sum(amount) filter (where status = 'pending'), 0),
         coalesce(sum(amount) filter (where carried_forward and status in ('approved','processing','failed')), 0), count(*) filter (where status = 'processing')
    into approved, pend, carried, processing
    from public.payments where cycle_date = pay and (uid is null or user_id = uid);
  st := case when processing > 0 then 'Processing' when current_date > dl then 'Approvals closed' when current_date > cut then 'Cutoff passed: new approvals move to the next cycle' else 'Open' end;
  return json_build_object('paymentDate', pay, 'cutoffDate', cut, 'approvalDeadline', dl, 'status', st,
    'approvedForCycle', approved, 'pendingForCycle', pend, 'carriedForward', carried, 'daysUntilPayment', pay - current_date);
end $$;
revoke all on function public._payment_calendar(uuid) from public, anon, authenticated;

create or replace function public.payment_calendar(p_user uuid default null) returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  return public._payment_calendar(case when public.is_admin() then p_user else auth.uid() end);
end $$;

create or replace function public.earnings_summary(p_user uuid default null) returns json
language plpgsql stable security definer set search_path = public as $$
declare uid uuid; lifetime numeric; pend numeric; appr numeric; paid numeric; tracked numeric; secs bigint; month_amt numeric;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  uid := case when public.is_admin() then p_user else auth.uid() end;
  select coalesce(sum(amount) filter (where status <> 'rejected'), 0),
         coalesce(sum(amount) filter (where status = 'pending'), 0),
         coalesce(sum(amount) filter (where status in ('approved','processing','failed')), 0),
         coalesce(sum(amount) filter (where status = 'paid'), 0)
    into lifetime, pend, appr, paid from public.payments where (uid is null or user_id = uid);
  select coalesce(sum(round(public.seg_seconds(s) * a.agreed_rate / 3600.0, 2)), 0), coalesce(sum(public.seg_seconds(s)), 0),
         coalesce(sum(round(public.seg_seconds(s) * a.agreed_rate / 3600.0, 2)) filter (where date_trunc('month', s.started_at at time zone 'UTC') = date_trunc('month', now() at time zone 'UTC')), 0)
    into tracked, secs, month_amt
    from public.time_segments s join public.assignments a on a.id = s.assignment_id where a.status <> 'cancelled' and (uid is null or a.user_id = uid);
  pend := pend + coalesce((select sum(round(a.submitted_seconds * a.agreed_rate / 3600.0, 2)) from public.assignments a where a.status = 'submitted' and (uid is null or a.user_id = uid)), 0);
  return json_build_object('currency', 'USD', 'lifetime', lifetime, 'currentMonth', month_amt, 'tracked', tracked, 'pending', pend, 'approved', appr, 'paid', paid,
    'hours', round(secs / 3600.0, 2), 'calendar', public._payment_calendar(uid));
end $$;

create or replace function public._earnings_statement(uid uuid, p_from date, p_to date) returns json
language plpgsql stable security definer set search_path = public as $$
declare projects json; weeks json; totals json; pays json; nm text;
begin
  select display_name into nm from public.profiles where id = uid;
  with r as (select * from public._earnings_rows(uid, p_from, p_to, 'week'))
  select
    (select coalesce(json_agg(x order by x.title), '[]'::json) from (
      select task_title as title, rate, sum(seconds)::integer as seconds, sum(tracked_amount) as tracked, sum(pending_amount) as pending,
             sum(approved_amount) as approved, sum(paid_amount) as paid, max(payment_status) as "paymentStatus", max(cycle_date) as "cycleDate", max(user_name) as "taskerName"
      from r group by task_title, rate, assignment_id) x),
    (select coalesce(json_agg(w order by w.start), '[]'::json) from (
      select bucket as start, (bucket + 6) as "end", sum(seconds)::integer as seconds, sum(tracked_amount) as tracked, sum(pending_amount) as pending,
             sum(approved_amount) as approved, sum(paid_amount) as paid, count(distinct assignment_id)::integer as projects
      from r group by bucket) w),
    (select json_build_object('seconds', coalesce(sum(seconds), 0), 'tracked', coalesce(sum(tracked_amount), 0), 'pending', coalesce(sum(pending_amount), 0),
       'approved', coalesce(sum(approved_amount), 0), 'paid', coalesce(sum(paid_amount), 0), 'projects', count(distinct assignment_id)) from r)
  into projects, weeks, totals;
  select coalesce(json_agg(json_build_object('reference', p.payment_ref, 'amount', p.amount, 'status', p.status, 'cycleDate', p.cycle_date, 'method', p.method, 'paidAt', p.paid_at,
           'hours', round(p.seconds / 3600.0, 2)) order by p.created_at), '[]'::json)
    into pays from public.payments p where p.user_id = uid and p.created_at::date between p_from and p_to;
  return json_build_object('reference', 'STM-' || upper(substr(md5(uid::text || p_from::text || p_to::text), 1, 10)), 'currency', 'USD', 'taskerName', nm,
    'from', p_from, 'to', p_to, 'generatedAt', now(), 'projects', projects, 'weeks', weeks, 'totals', totals, 'payments', pays);
end $$;
revoke all on function public._earnings_statement(uuid, date, date) from public, anon, authenticated;

create or replace function public.earnings_statement(p_user uuid, p_from date, p_to date) returns json
language plpgsql stable security definer set search_path = public as $$
declare uid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  uid := case when public.is_admin() and p_user is not null then p_user else auth.uid() end;
  if p_to < p_from or p_to - p_from > 400 then raise exception 'Invalid statement period'; end if;
  return public._earnings_statement(uid, p_from, p_to);
end $$;

-- ------------------------------------------------------------------ scheduled jobs: statements + reminders
create or replace function public.enqueue_statements() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; u record; f date; t date; st json; kind text; wk date;
begin
  -- Mondays: last week's statement. First of the month: last month's statement.
  for kind in select unnest(array[case when extract(isodow from current_date) = 1 then 'week' end, case when extract(day from current_date) = 1 then 'month' end]) loop
    continue when kind is null;
    if kind = 'week' then f := current_date - 7; t := current_date - 1;
    else f := (date_trunc('month', current_date) - interval '1 month')::date; t := current_date - 1; end if;
    for u in select distinct a.user_id from public.assignments a join public.time_segments s on s.assignment_id = a.id where (s.started_at at time zone 'UTC')::date between f and t loop
      st := public._earnings_statement(u.user_id, f, t);
      perform public.notify(u.user_id, 'statement', case when kind = 'week' then 'Your weekly earnings statement is ready' else 'Your monthly earnings statement is ready' end,
        'Statement ' || (st->>'reference') || ' for ' || f::text || ' to ' || t::text || '.', '/earnings/statements/' || kind || '/' || f::text,
        'stmt-' || kind || '-' || u.user_id::text || '-' || f::text, case when kind = 'week' then 'weekly_statement' else 'monthly_statement' end,
        jsonb_build_object('statement', st::jsonb, 'period', f::text || ' to ' || t::text));
      n := n + 1;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function public.enqueue_statements() from public, anon, authenticated;

create or replace function public.run_scheduled_jobs() returns json
language plpgsql security definer set search_path = public as $$
declare r integer; s integer;
begin
  r := public.enqueue_reminders();
  s := public.enqueue_statements();
  return json_build_object('reminders', r, 'statements', s, 'at', now());
end $$;
revoke all on function public.run_scheduled_jobs() from public, anon, authenticated;
grant execute on function public.run_scheduled_jobs() to service_role;
-- Admins may trigger a run by hand from the Settings screen.
create or replace function public.admin_run_jobs() returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  return public.run_scheduled_jobs();
end $$;

-- ------------------------------------------------------------------ permissions
do $$ declare f text; begin
  foreach f in array array['save_payout_account(text,text,text,text,text)','save_airtm_account(text,text,boolean)','reveal_payout_account(uuid)','adjust_payment(uuid,integer,text)',
    'approve_payment_batch(date)','start_processing_batch(date)','carry_forward_cycle(date)','earnings_rows(uuid,date,date,text)','payment_calendar(uuid)',
    'earnings_summary(uuid)','earnings_statement(uuid,date,date)','admin_run_jobs()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
