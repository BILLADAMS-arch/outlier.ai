-- Work submissions and payment approvals. Run AFTER supabase/schema.sql.
-- Safe to re-run.
--
-- Flow: admin accepts an application (agreeing an hourly rate) -> worker submits work
-- with hours -> admin approves the work -> a PENDING payment is created automatically
-- (hours x agreed rate) -> admin approves the payment -> after sending the money outside
-- this app, admin marks it PAID with a reference. Amounts cannot be edited afterwards.
-- This records approvals only; it does not move money.

alter table public.applications
  add column if not exists agreed_rate numeric(6,2) check (agreed_rate between 10 and 200);

-- Re-define the application guard: workers may only withdraw; only admins may set agreed_rate.
-- When accepted without an explicit rate, default to the proposed rate, else the listed rate.
create or replace function public.guard_application_update() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if current_user in ('anon','authenticated') and not public.is_admin() then
    if new.status <> 'withdrawn' or old.status not in ('submitted','reviewing')
       or new.task_id <> old.task_id or new.user_id <> old.user_id or new.note <> old.note
       or new.reviewer_note <> old.reviewer_note or new.proposed_rate is distinct from old.proposed_rate
       or new.agreed_rate is distinct from old.agreed_rate then
      raise exception 'You can only withdraw your own pending application';
    end if;
  end if;
  if new.status = 'accepted' and new.agreed_rate is null then
    select coalesce(new.proposed_rate, t.hourly_rate) into new.agreed_rate from public.tasks t where t.id = new.task_id;
  end if;
  return new;
end $$;

create table if not exists public.work_submissions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  hours_worked numeric(5,1) not null check (hours_worked > 0 and hours_worked <= 500),
  summary text not null check (char_length(summary) between 20 and 2000),
  link text check (link is null or link ~* '^https?://'),
  status text not null default 'submitted' check (status in ('submitted','approved','revision','rejected')),
  reviewer_note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists one_open_submission on public.work_submissions(application_id) where status in ('submitted','approved');

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.work_submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hours numeric(5,1) not null,
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

-- Work submissions: workers can't change a submission after sending it; admins only review.
create or replace function public.guard_submission_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.application_id <> old.application_id or new.user_id <> old.user_id or new.hours_worked <> old.hours_worked
     or new.summary <> old.summary or new.link is distinct from old.link then
    raise exception 'A submission cannot be edited; submit a new one instead';
  end if;
  if new.status <> old.status then new.reviewed_at := now(); end if;
  return new;
end $$;
drop trigger if exists guard_submission_update on public.work_submissions;
create trigger guard_submission_update before update on public.work_submissions
  for each row execute function public.guard_submission_update();

-- Approving work creates exactly one pending payment: hours x agreed rate.
create or replace function public.create_payment_for_approved_work() returns trigger
language plpgsql security definer set search_path = public as $$
declare r numeric;
begin
  if new.status = 'approved' and old.status <> 'approved' then
    select coalesce(a.agreed_rate, a.proposed_rate, t.hourly_rate) into r
      from public.applications a join public.tasks t on t.id = a.task_id where a.id = new.application_id;
    insert into public.payments (submission_id, user_id, hours, hourly_rate, amount)
      values (new.id, new.user_id, new.hours_worked, r, round(new.hours_worked * r, 2))
      on conflict (submission_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists create_payment_for_approved_work on public.work_submissions;
create trigger create_payment_for_approved_work after update on public.work_submissions
  for each row execute function public.create_payment_for_approved_work();

-- Payments: amounts are frozen; status may only move pending -> approved|rejected, approved -> paid.
create or replace function public.guard_payment_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.amount <> old.amount or new.hours <> old.hours or new.hourly_rate <> old.hourly_rate
     or new.user_id <> old.user_id or new.submission_id <> old.submission_id then
    raise exception 'Payment amounts cannot be changed';
  end if;
  if new.status <> old.status then
    if not ((old.status = 'pending' and new.status in ('approved','rejected')) or (old.status = 'approved' and new.status = 'paid')) then
      raise exception 'Invalid payment status change: % to %', old.status, new.status;
    end if;
    if new.status = 'approved' then new.approved_by := coalesce(auth.uid(), new.approved_by); new.approved_at := now(); end if;
    if new.status = 'paid' then
      if char_length(trim(new.reference)) = 0 then raise exception 'A payment reference is required to mark a payment as paid'; end if;
      new.paid_at := now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_payment_update on public.payments;
create trigger guard_payment_update before update on public.payments
  for each row execute function public.guard_payment_update();

alter table public.work_submissions enable row level security;
alter table public.payments enable row level security;

drop policy if exists "submissions read own or admin" on public.work_submissions;
create policy "submissions read own or admin" on public.work_submissions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "submissions insert own" on public.work_submissions;
create policy "submissions insert own" on public.work_submissions for insert to authenticated
  with check (user_id = auth.uid() and status = 'submitted' and reviewer_note = ''
    and exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid() and a.status = 'accepted'));
drop policy if exists "submissions admin update" on public.work_submissions;
create policy "submissions admin update" on public.work_submissions for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "submissions admin delete" on public.work_submissions;
create policy "submissions admin delete" on public.work_submissions for delete using (public.is_admin());

drop policy if exists "payments read own or admin" on public.payments;
create policy "payments read own or admin" on public.payments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "payments admin update" on public.payments;
create policy "payments admin update" on public.payments for update using (public.is_admin()) with check (public.is_admin());
-- No insert/delete policies: payments are created only by the trigger above.

notify pgrst, 'reload schema';
