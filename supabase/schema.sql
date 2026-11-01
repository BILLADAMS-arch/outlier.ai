-- Outlier marketplace schema for Supabase (Postgres + RLS).
-- Run once in the Supabase SQL editor. Safe to re-run: uses IF NOT EXISTS / OR REPLACE.
-- To make someone an admin, run (as the project owner in the SQL editor):
--   update public.profiles set role = 'admin' where id = '<user uuid>';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.categories (
  id text primary key,
  name text not null unique,
  icon text not null default 'fa-briefcase' check (icon ~ '^fa-[a-z0-9-]+$'),
  images text[] not null check (cardinality(images) >= 1)
);

create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) between 5 and 120),
  category_id text not null references public.categories(id) on delete restrict,
  image text,
  difficulty text not null check (difficulty in ('Easy','Intermediate','Hard','Expert')),
  hourly_rate numeric(6,2) not null check (hourly_rate between 10 and 200),
  currency text not null default 'USD' check (currency = 'USD'),
  rate_type text not null default 'fixed' check (rate_type in ('fixed','negotiable')),
  estimated_hours integer not null check (estimated_hours between 1 and 500),
  experience text not null,
  skills text[] not null check (cardinality(skills) >= 1),
  summary text not null,
  description text not null,
  responsibilities text[] not null default '{}',
  deliverables text[] not null default '{}',
  qualifications text[] not null default '{}',
  apply_instructions text not null default '',
  posted_at date not null default current_date,
  deadline date,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  -- rate must match the difficulty band
  constraint rate_matches_difficulty check (
    (difficulty = 'Easy' and hourly_rate between 10 and 25) or
    (difficulty = 'Intermediate' and hourly_rate between 25 and 50) or
    (difficulty = 'Hard' and hourly_rate between 50 and 90) or
    (difficulty = 'Expert' and hourly_rate between 90 and 200))
);
create index if not exists tasks_category_idx on public.tasks(category_id);
create index if not exists tasks_status_rate_idx on public.tasks(status, hourly_rate);
create index if not exists tasks_skills_idx on public.tasks using gin (skills);
create index if not exists tasks_search_idx on public.tasks using gin (to_tsvector('english', title || ' ' || summary));

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  status text not null default 'submitted' check (status in ('submitted','reviewing','accepted','rejected','withdrawn')),
  note text not null check (char_length(note) between 30 and 1000),
  availability text not null,
  proposed_rate numeric(6,2) check (proposed_rate between 10 and 200),
  reviewer_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists one_active_application on public.applications(task_id, user_id) where status <> 'withdrawn';

-- Applicants may only withdraw their own application; reviewers do everything else.
create or replace function public.guard_application_update() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if current_user in ('anon','authenticated') and not public.is_admin() then
    if new.status <> 'withdrawn' or old.status not in ('submitted','reviewing')
       or new.task_id <> old.task_id or new.user_id <> old.user_id or new.note <> old.note
       or new.reviewer_note <> old.reviewer_note or new.proposed_rate is distinct from old.proposed_rate then
      raise exception 'You can only withdraw your own pending application';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_application_update on public.applications;
create trigger guard_application_update before update on public.applications
  for each row execute function public.guard_application_update();

-- Users may not promote themselves.
create or replace function public.guard_profile_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.role <> old.role and current_user in ('anon','authenticated') and not public.is_admin() then raise exception 'Role cannot be changed'; end if;
  return new;
end $$;
drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.applications enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "categories read" on public.categories;
create policy "categories read" on public.categories for select using (true);
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tasks read published" on public.tasks;
create policy "tasks read published" on public.tasks for select using (status = 'published' or public.is_admin());
drop policy if exists "tasks admin write" on public.tasks;
create policy "tasks admin write" on public.tasks for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "applications read own or admin" on public.applications;
create policy "applications read own or admin" on public.applications for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "applications insert own" on public.applications;
create policy "applications insert own" on public.applications for insert to authenticated
  with check (user_id = auth.uid() and status = 'submitted' and reviewer_note = ''
    and exists (select 1 from public.tasks t where t.id = task_id and t.status = 'published' and (t.deadline is null or t.deadline >= current_date)));
drop policy if exists "applications update own or admin" on public.applications;
create policy "applications update own or admin" on public.applications for update using (user_id = auth.uid() or public.is_admin());
drop policy if exists "applications admin delete" on public.applications;
create policy "applications admin delete" on public.applications for delete using (public.is_admin());

-- Make the API pick up the new tables immediately.
notify pgrst, 'reload schema';
