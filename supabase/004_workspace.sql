-- Integrated working environment: saved work, versions, files, submissions, reviews,
-- heartbeat-based time tracking and audited hour adjustments.
-- Run AFTER 003_react_workflow.sql. Safe to re-run.

-- ------------------------------------------------------------------ settings
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.app_settings (key, value) values
  ('inactivity_grace_seconds', '180'),      -- an open timer stops counting this long after the last heartbeat
  ('inactivity_pause_minutes', '10')        -- the browser pauses the timer after this long without input
on conflict (key) do nothing;
alter table public.app_settings enable row level security;
drop policy if exists "settings read" on public.app_settings;
create policy "settings read" on public.app_settings for select to authenticated using (true);
-- Writes only through set_setting() below.

create or replace function public.setting_int(p_key text, p_default integer) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((select value::integer from public.app_settings where key = p_key and value ~ '^[0-9]+$'), p_default);
$$;
create or replace function public.setting_text(p_key text, p_default text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.app_settings where key = p_key), p_default);
$$;
create or replace function public.set_setting(p_key text, p_value text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if p_key !~ '^[a-z_]{3,60}$' then raise exception 'Invalid setting name'; end if;
  insert into public.app_settings (key, value, updated_by) values (p_key, p_value, auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end $$;

-- ------------------------------------------------------------------ project environment configuration
alter table public.tasks add column if not exists workspace_type text
  check (workspace_type is null or workspace_type in ('writing','data_entry','research','transcription','code','design','analysis','assistant'));
alter table public.tasks add column if not exists workspace_config jsonb not null default '{}'::jsonb;

-- assignments gain a "rejected" outcome and a record of the time that was submitted
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'assignments_status_check') then
    alter table public.assignments drop constraint assignments_status_check;
  end if;
  alter table public.assignments add constraint assignments_status_check
    check (status in ('assigned','in_progress','submitted','completed','cancelled','rejected'));
end $$;
alter table public.assignments add column if not exists submitted_seconds integer;

-- ------------------------------------------------------------------ time tracking (server authoritative + heartbeat)
alter table public.time_segments add column if not exists last_heartbeat timestamptz not null default now();

create or replace function public.seg_seconds(s public.time_segments) returns integer
language sql stable set search_path = public as $$
  -- Closed segments count to ended_at; an open one counts to now, but never past the last heartbeat plus
  -- the grace period (so a closed laptop stops accruing) and never more than 12 hours.
  select greatest(0, floor(extract(epoch from (
    case when s.ended_at is not null then least(s.ended_at, s.started_at + interval '12 hours')
         else least(now(), s.last_heartbeat + make_interval(secs => public.setting_int('inactivity_grace_seconds', 180)), s.started_at + interval '12 hours') end
    - s.started_at))))::integer;
$$;

create or replace function public.tracked_seconds(p_assignment uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(public.seg_seconds(s)), 0)::integer
  from public.time_segments s join public.assignments a on a.id = s.assignment_id
  where s.assignment_id = p_assignment and (a.user_id = auth.uid() or public.is_admin());
$$;

create or replace function public.start_work(p_assignment uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.assignments; grace interval := make_interval(secs => public.setting_int('inactivity_grace_seconds', 180));
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not public.is_approved() then raise exception 'Your account is not approved'; end if;
  select * into a from public.assignments where id = p_assignment and user_id = auth.uid() for update;
  if not found then raise exception 'Project not found'; end if;
  if a.status not in ('assigned','in_progress') then raise exception 'This project is % and cannot be worked on', a.status; end if;
  if a.onboarded_at is null then raise exception 'Complete onboarding before starting work'; end if;
  -- A timer left behind by a closed browser is ended at its last heartbeat before checking for duplicates.
  update public.time_segments set ended_at = least(last_heartbeat + grace, started_at + interval '12 hours')
    where user_id = auth.uid() and ended_at is null and now() > last_heartbeat + grace;
  if exists (select 1 from public.time_segments where user_id = auth.uid() and ended_at is null) then
    if exists (select 1 from public.time_segments where user_id = auth.uid() and ended_at is null and assignment_id = p_assignment) then
      return public.timer_state(p_assignment);   -- already running here: resume is idempotent
    end if;
    raise exception 'A timer is already running on another project. Pause it before starting this one.';
  end if;
  insert into public.time_segments (assignment_id, user_id) values (p_assignment, auth.uid());
  update public.assignments set status = 'in_progress', started_at = coalesce(started_at, now()) where id = p_assignment;
  return public.timer_state(p_assignment);
end $$;

create or replace function public.pause_work(p_assignment uuid) returns json
language plpgsql security definer set search_path = public as $$
declare grace interval := make_interval(secs => public.setting_int('inactivity_grace_seconds', 180));
begin
  update public.time_segments set ended_at = least(now(), last_heartbeat + grace, started_at + interval '12 hours')
    where assignment_id = p_assignment and user_id = auth.uid() and ended_at is null;
  if not found then raise exception 'No timer is running for this project'; end if;
  return public.timer_state(p_assignment);
end $$;

-- Called every minute by the open workspace. A beat that arrives after the grace period does not revive the timer.
create or replace function public.heartbeat(p_assignment uuid) returns json
language plpgsql security definer set search_path = public as $$
declare s public.time_segments; grace interval := make_interval(secs => public.setting_int('inactivity_grace_seconds', 180));
begin
  select * into s from public.time_segments where assignment_id = p_assignment and user_id = auth.uid() and ended_at is null for update;
  if found then
    if now() > s.last_heartbeat + grace then
      update public.time_segments set ended_at = least(s.last_heartbeat + grace, s.started_at + interval '12 hours') where id = s.id;
    else
      update public.time_segments set last_heartbeat = now() where id = s.id;
    end if;
  end if;
  return public.timer_state(p_assignment);
end $$;

-- ------------------------------------------------------------------ workspaces, drafts and versions
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  notes text not null default '',
  version integer not null default 0,
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workspace_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version integer not null,
  revision integer not null,
  kind text not null check (kind in ('auto','manual','submit','revision')),
  data jsonb not null,
  progress jsonb not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists workspace_versions_idx on public.workspace_versions(workspace_id, created_at desc);

create table if not exists public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('deliverable','attachment','audio','data')),
  slot text,                                  -- which required deliverable this file satisfies
  name text not null check (char_length(name) between 1 and 200),
  version integer not null default 1,
  path text not null unique,
  size bigint not null check (size > 0 and size <= 26214400),
  mime text not null,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);
create index if not exists workspace_files_idx on public.workspace_files(assignment_id, created_at);

create table if not exists public.project_resources (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.tasks(id) on delete cascade,
  kind text not null check (kind in ('document','reference','audio','link')),
  label text not null check (char_length(label) between 1 and 200),
  path text,
  url text check (url is null or url ~* '^https?://'),
  mime text,
  created_at timestamptz not null default now(),
  check ((path is not null) <> (url is not null))
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  round integer not null,
  workspace_version integer not null,
  data jsonb not null,
  progress jsonb not null,
  notes text not null default '',
  files jsonb not null default '[]'::jsonb,
  summary text not null,
  link text,
  tracked_seconds integer not null,
  status text not null default 'submitted' check (status in ('submitted','revision_requested','approved','rejected')),
  submitted_at timestamptz not null default now(),
  unique (assignment_id, round)
);
create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id uuid not null references auth.users(id) default auth.uid(),
  kind text not null check (kind in ('revision','approval','rejection','note')),
  body text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.time_adjustments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  admin_id uuid not null references auth.users(id) default auth.uid(),
  tracked_seconds integer not null,
  original_seconds integer not null,
  adjusted_seconds integer not null,
  reason text not null check (char_length(reason) >= 3),
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.workspace_versions enable row level security;
alter table public.workspace_files enable row level security;
alter table public.project_resources enable row level security;
alter table public.submissions enable row level security;
alter table public.review_comments enable row level security;
alter table public.time_adjustments enable row level security;

drop policy if exists "workspaces read" on public.workspaces;
create policy "workspaces read" on public.workspaces for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "versions read" on public.workspace_versions;
create policy "versions read" on public.workspace_versions for select
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and (w.user_id = auth.uid() or public.is_admin())));
drop policy if exists "files read" on public.workspace_files;
create policy "files read" on public.workspace_files for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "resources read" on public.project_resources;
create policy "resources read" on public.project_resources for select
  using (public.is_admin() or exists (select 1 from public.assignments a where a.task_id = project_resources.task_id and a.user_id = auth.uid()));
drop policy if exists "resources admin write" on public.project_resources;
create policy "resources admin write" on public.project_resources for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "submissions read" on public.submissions;
create policy "submissions read" on public.submissions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "comments read" on public.review_comments;
create policy "comments read" on public.review_comments for select
  using (exists (select 1 from public.submissions s where s.id = submission_id and (s.user_id = auth.uid() or public.is_admin())));
drop policy if exists "adjustments read" on public.time_adjustments;
create policy "adjustments read" on public.time_adjustments for select using (public.is_admin());
-- No other write policies: work is written only through the functions below.

-- ------------------------------------------------------------------ workspace functions
create or replace function public.get_workspace(p_assignment uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.assignments; w public.workspaces;
begin
  select * into a from public.assignments where id = p_assignment and (user_id = auth.uid() or public.is_admin());
  if not found then raise exception 'Project not found'; end if;
  select * into w from public.workspaces where assignment_id = p_assignment;
  if not found then
    if a.user_id <> auth.uid() then return null; end if;
    insert into public.workspaces (assignment_id, user_id) values (p_assignment, a.user_id) returning * into w;
  end if;
  return json_build_object('id', w.id, 'data', w.data, 'progress', w.progress, 'notes', w.notes, 'version', w.version,
    'revision', w.revision, 'updatedAt', w.updated_at, 'locked', a.status not in ('assigned','in_progress'));
end $$;

create or replace function public.save_workspace(p_assignment uuid, p_data jsonb, p_progress jsonb, p_notes text, p_base_version integer, p_kind text default 'auto') returns json
language plpgsql security definer set search_path = public as $$
declare a public.assignments; w public.workspaces; last_auto timestamptz;
begin
  if p_kind not in ('auto','manual') then raise exception 'Invalid save type'; end if;
  select * into a from public.assignments where id = p_assignment and user_id = auth.uid();
  if not found then raise exception 'Project not found'; end if;
  if a.status not in ('assigned','in_progress') then raise exception 'This work is locked (%). It can be edited again only if an administrator requests revisions.', a.status; end if;
  if a.onboarded_at is null then raise exception 'Complete onboarding first'; end if;
  if octet_length(p_data::text) > 5000000 or octet_length(coalesce(p_notes, '')) > 200000 then raise exception 'This workspace is too large to save. Move large content into file attachments.'; end if;
  select * into w from public.workspaces where assignment_id = p_assignment for update;
  if not found then insert into public.workspaces (assignment_id, user_id) values (p_assignment, auth.uid()) returning * into w; end if;
  if p_base_version <> w.version then raise exception 'STALE: this workspace was changed in another tab or session. Reload to continue.'; end if;
  update public.workspaces set data = p_data, progress = coalesce(p_progress, '{}'::jsonb), notes = coalesce(p_notes, ''),
    version = version + 1, updated_at = now() where id = w.id returning * into w;
  if p_kind = 'manual' then
    insert into public.workspace_versions (workspace_id, version, revision, kind, data, progress, notes) values (w.id, w.version, w.revision, 'manual', w.data, w.progress, w.notes);
  else
    select max(created_at) into last_auto from public.workspace_versions where workspace_id = w.id and kind in ('auto','manual');
    if last_auto is null or last_auto < now() - interval '5 minutes' then
      insert into public.workspace_versions (workspace_id, version, revision, kind, data, progress, notes) values (w.id, w.version, w.revision, 'auto', w.data, w.progress, w.notes);
    end if;
  end if;
  return json_build_object('version', w.version, 'savedAt', w.updated_at);
end $$;

create or replace function public.register_file(p_assignment uuid, p_kind text, p_slot text, p_name text, p_path text, p_size bigint, p_mime text) returns json
language plpgsql security definer set search_path = public as $$
declare a public.assignments; v integer; f public.workspace_files;
begin
  select * into a from public.assignments where id = p_assignment and user_id = auth.uid();
  if not found then raise exception 'Project not found'; end if;
  if a.status not in ('assigned','in_progress') then raise exception 'This work is locked and cannot take new files'; end if;
  if p_path not like auth.uid()::text || '/' || p_assignment::text || '/%' then raise exception 'Invalid file location'; end if;
  select coalesce(max(version), 0) + 1 into v from public.workspace_files
    where assignment_id = p_assignment and name = p_name and kind = p_kind and coalesce(slot, '') = coalesce(p_slot, '');
  insert into public.workspace_files (assignment_id, user_id, kind, slot, name, version, path, size, mime)
    values (p_assignment, auth.uid(), p_kind, nullif(p_slot, ''), p_name, v, p_path, p_size, p_mime) returning * into f;
  return row_to_json(f);
end $$;

create or replace function public.remove_file(p_file uuid) returns void
language plpgsql security definer set search_path = public as $$
declare f public.workspace_files; a public.assignments;
begin
  select * into f from public.workspace_files where id = p_file and user_id = auth.uid();
  if not found then raise exception 'File not found'; end if;
  select * into a from public.assignments where id = f.assignment_id;
  if a.status not in ('assigned','in_progress') then raise exception 'Submitted work cannot be changed'; end if;
  update public.workspace_files set removed_at = now() where id = p_file;   -- the stored object is kept for the audit trail
end $$;

-- ------------------------------------------------------------------ submission, review, approval
create or replace function public.submit_work(p_assignment uuid, p_note text, p_link text) returns json
language plpgsql security definer set search_path = public as $$
declare a public.assignments; w public.workspaces; cfg jsonb; item jsonb; missing text[] := '{}'; tracked integer; files jsonb;
        grace interval := make_interval(secs => public.setting_int('inactivity_grace_seconds', 180));
begin
  select * into a from public.assignments where id = p_assignment and user_id = auth.uid() for update;
  if not found then raise exception 'Project not found'; end if;
  if a.status <> 'in_progress' then raise exception 'Only a project in progress can be submitted'; end if;
  if char_length(coalesce(p_note, '')) < 20 or char_length(p_note) > 2000 then raise exception 'Describe your work in 20 to 2000 characters'; end if;
  if p_link is not null and p_link <> '' and p_link !~* '^https?://' then raise exception 'The deliverables link must start with http:// or https://'; end if;
  select * into w from public.workspaces where assignment_id = p_assignment for update;
  if not found then insert into public.workspaces (assignment_id, user_id) values (p_assignment, auth.uid()) returning * into w; end if;
  select workspace_config into cfg from public.tasks where id = a.task_id;
  for item in select * from jsonb_array_elements(coalesce(cfg->'requiredDeliverables', '[]'::jsonb)) loop
    if coalesce(item->>'kind', 'file') = 'file' then
      if not exists (select 1 from public.workspace_files f where f.assignment_id = p_assignment and f.removed_at is null and f.kind = 'deliverable' and f.slot = item->>'id') then
        missing := missing || (coalesce(item->>'label', item->>'id') || ' (file)');
      end if;
    else
      if coalesce(btrim(w.data #>> array['sections', item->>'key']), '') = '' and coalesce(btrim(w.data #>> array[item->>'key']), '') = '' then
        missing := missing || (coalesce(item->>'label', item->>'key') || ' (section)');
      end if;
    end if;
  end loop;
  for item in select * from jsonb_array_elements(coalesce(cfg->'subtasks', '[]'::jsonb)) loop
    if coalesce((item->>'required')::boolean, false) and coalesce(w.progress->>(item->>'id'), 'false') <> 'true' then
      missing := missing || ('subtask: ' || coalesce(item->>'title', item->>'id'));
    end if;
  end loop;
  if array_length(missing, 1) > 0 then raise exception 'Missing required items: %', array_to_string(missing, '; '); end if;

  update public.time_segments set ended_at = least(now(), last_heartbeat + grace, started_at + interval '12 hours')
    where assignment_id = p_assignment and user_id = auth.uid() and ended_at is null;
  tracked := public.tracked_seconds(p_assignment);
  if tracked < 60 then raise exception 'Track at least one minute of work before submitting'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'kind', f.kind, 'slot', f.slot, 'version', f.version, 'path', f.path, 'size', f.size, 'mime', f.mime) order by f.created_at), '[]'::jsonb)
    into files from public.workspace_files f where f.assignment_id = p_assignment and f.removed_at is null;
  insert into public.submissions (assignment_id, user_id, round, workspace_version, data, progress, notes, files, summary, link, tracked_seconds)
    values (p_assignment, auth.uid(), w.revision + 1, w.version, w.data, w.progress, w.notes, files, p_note, nullif(p_link, ''), tracked);
  insert into public.workspace_versions (workspace_id, version, revision, kind, data, progress, notes) values (w.id, w.version, w.revision, 'submit', w.data, w.progress, w.notes);
  update public.assignments set status = 'submitted', submitted_at = now(), submitted_seconds = tracked, submission_note = p_note,
    submission_link = nullif(p_link, ''), reviewer_note = '' where id = p_assignment;
  return public.timer_state(p_assignment);
end $$;

create or replace function public.request_changes(p_assignment uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.submissions;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if char_length(coalesce(p_note, '')) < 3 then raise exception 'Explain what needs to change'; end if;
  select * into s from public.submissions where assignment_id = p_assignment order by round desc limit 1 for update;
  update public.assignments set status = 'in_progress', reviewer_note = p_note where id = p_assignment and status = 'submitted';
  if not found or s.id is null then raise exception 'Only submitted work can be sent back'; end if;
  update public.submissions set status = 'revision_requested' where id = s.id;
  insert into public.review_comments (submission_id, kind, body) values (s.id, 'revision', p_note);
  update public.workspaces set revision = revision + 1 where assignment_id = p_assignment;
  insert into public.workspace_versions (workspace_id, version, revision, kind, data, progress, notes)
    select id, version, revision, 'revision', data, progress, notes from public.workspaces where assignment_id = p_assignment;
end $$;

create or replace function public.reject_work(p_assignment uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.submissions;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if char_length(coalesce(p_note, '')) < 3 then raise exception 'Explain why the work is rejected'; end if;
  select * into s from public.submissions where assignment_id = p_assignment order by round desc limit 1 for update;
  update public.assignments set status = 'rejected', reviewer_note = p_note where id = p_assignment and status = 'submitted';
  if not found or s.id is null then raise exception 'Only submitted work can be rejected'; end if;
  update public.submissions set status = 'rejected' where id = s.id;
  insert into public.review_comments (submission_id, kind, body) values (s.id, 'rejection', p_note);
end $$;

drop function if exists public.approve_work(uuid, integer, text);
create or replace function public.approve_work(p_assignment uuid, p_seconds integer, p_note text default '', p_reason text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare a public.assignments; s public.submissions; tracked integer; pay_id uuid;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  select * into a from public.assignments where id = p_assignment for update;
  if not found or a.status <> 'submitted' then raise exception 'Only submitted work can be approved'; end if;
  select * into s from public.submissions where assignment_id = p_assignment order by round desc limit 1 for update;
  tracked := coalesce(s.tracked_seconds, public.tracked_seconds(p_assignment));
  if p_seconds is null or p_seconds < 0 or p_seconds > tracked then raise exception 'Approved time must be between 0 and the submitted % seconds', tracked; end if;
  if p_seconds <> tracked and char_length(coalesce(p_reason, '')) < 3 then raise exception 'Give a reason when approving a different amount of time than was submitted'; end if;
  if p_seconds <> tracked then
    insert into public.time_adjustments (assignment_id, submission_id, tracked_seconds, original_seconds, adjusted_seconds, reason)
      values (p_assignment, s.id, public.tracked_seconds(p_assignment), tracked, p_seconds, p_reason);
  end if;
  update public.assignments set status = 'completed', completed_at = now(), approved_seconds = p_seconds, reviewer_note = coalesce(p_note, '') where id = p_assignment;
  if s.id is not null then
    update public.submissions set status = 'approved' where id = s.id;
    insert into public.review_comments (submission_id, kind, body) values (s.id, 'approval', coalesce(nullif(p_note, ''), 'Approved'));
  end if;
  insert into public.payments (assignment_id, user_id, seconds, hourly_rate, amount)
    values (p_assignment, a.user_id, p_seconds, a.agreed_rate, round(p_seconds * a.agreed_rate / 3600.0, 2)) returning id into pay_id;
  return pay_id;
end $$;

-- ------------------------------------------------------------------ private file storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('workspace-files', 'workspace-files', false, 26214400, array[
    'image/png','image/jpeg','image/webp','image/gif','image/svg+xml','application/pdf','text/plain','text/csv','text/markdown','application/json',
    'text/html','text/css','text/javascript','application/zip','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/ogg','audio/webm','application/octet-stream']),
  ('project-resources', 'project-resources', false, 52428800, null)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "wf insert own" on storage.objects;
create policy "wf insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'workspace-files' and (storage.foldername(name))[1] = auth.uid()::text and public.is_approved());
drop policy if exists "wf read own or admin" on storage.objects;
create policy "wf read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'workspace-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
-- no update/delete policies: uploaded objects can never be overwritten or removed by app users

drop policy if exists "pr admin all" on storage.objects;
create policy "pr admin all" on storage.objects for all to authenticated
  using (bucket_id = 'project-resources' and public.is_admin()) with check (bucket_id = 'project-resources' and public.is_admin());
drop policy if exists "pr read assigned" on storage.objects;
create policy "pr read assigned" on storage.objects for select to authenticated
  using (bucket_id = 'project-resources' and exists (select 1 from public.assignments a where a.user_id = auth.uid() and a.task_id = (storage.foldername(name))[1]));

-- ------------------------------------------------------------------ permissions
do $$ declare f text; begin
  foreach f in array array['heartbeat(uuid)','get_workspace(uuid)','save_workspace(uuid,jsonb,jsonb,text,integer,text)','register_file(uuid,text,text,text,text,bigint,text)',
    'remove_file(uuid)','submit_work(uuid,text,text)','request_changes(uuid,text)','reject_work(uuid,text)','approve_work(uuid,integer,text,text)','set_setting(text,text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
