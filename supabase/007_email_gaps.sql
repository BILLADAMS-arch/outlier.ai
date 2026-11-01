-- Closes gaps found in the email audit. Run AFTER 006_earnings.sql. Safe to re-run.
--  1. Application decisions (approved / not selected) now also send emails.
--  2. Failures while queuing a notification are no longer silent: they are written to public.system_errors.

create table if not exists public.system_errors (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  context text not null,
  message text not null,
  detail jsonb not null default '{}'::jsonb
);
alter table public.system_errors enable row level security;
drop policy if exists "system errors admin read" on public.system_errors;
create policy "system errors admin read" on public.system_errors for select using (public.is_admin());

create or replace function public.log_system_error(p_context text, p_message text, p_detail jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.system_errors (context, message, detail) values (p_context, left(coalesce(p_message, ''), 1000), coalesce(p_detail, '{}'::jsonb));
exception when others then raise warning 'log_system_error failed: %', sqlerrm;
end $$;
revoke all on function public.log_system_error(text, text, jsonb) from public, anon, authenticated;

-- Same behaviour as before (a notification problem never blocks the real action), but the problem is now recorded.
create or replace function public.queue_email(p_user uuid, p_to text, p_type text, p_subject text, p_payload jsonb, p_related text, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.email_outbox (to_user, to_email, type, subject, payload, related_id, dedupe_key)
  values (p_user, p_to, p_type, p_subject, coalesce(p_payload, '{}'::jsonb), p_related, p_key)
  on conflict (dedupe_key) do nothing;
exception when others then
  raise warning 'queue_email failed: %', sqlerrm;
  perform public.log_system_error('queue_email:' || coalesce(p_type, '?'), sqlerrm, jsonb_build_object('to', p_to, 'key', p_key));
end $$;

create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_key text, p_email_type text default null, p_payload jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare nid uuid; em text; nm text;
begin
  insert into public.notifications (user_id, kind, title, body, link, dedupe_key) values (p_user, p_kind, p_title, coalesce(p_body, ''), p_link, p_key)
    on conflict (dedupe_key) do nothing returning id into nid;
  if nid is not null and p_email_type is not null then
    select email, display_name into em, nm from public.profiles where id = p_user;
    if em is null then
      perform public.log_system_error('notify:' || p_kind, 'No email address on file for the recipient', jsonb_build_object('user', p_user, 'type', p_email_type));
    else
      perform public.queue_email(p_user, em, p_email_type, p_title, coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('name', coalesce(nm, 'there'), 'link', p_link), p_link, p_key);
    end if;
  end if;
exception when others then
  raise warning 'notify failed: %', sqlerrm;
  perform public.log_system_error('notify:' || coalesce(p_kind, '?'), sqlerrm, jsonb_build_object('user', p_user, 'key', p_key));
end $$;

create or replace function public.notify_admins(p_kind text, p_title text, p_body text, p_link text, p_key text, p_email_type text default null, p_payload jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare adm record;
begin
  for adm in select id from public.profiles where role = 'admin' loop
    perform public.notify(adm.id, p_kind, p_title, p_body, p_link, p_key || ':' || adm.id::text, p_email_type, p_payload);
  end loop;
exception when others then
  raise warning 'notify_admins failed: %', sqlerrm;
  perform public.log_system_error('notify_admins:' || coalesce(p_kind, '?'), sqlerrm, jsonb_build_object('key', p_key));
end $$;
revoke execute on function public.notify(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.queue_email(uuid, text, text, text, jsonb, text, text) from public, anon, authenticated;

-- Application decisions: in-app notification AND email.
create or replace function public.trg_application_event() returns trigger language plpgsql security definer set search_path = public as $$
declare t public.tasks; nm text; asg uuid;
begin
  select * into t from public.tasks where id = new.task_id;
  if tg_op = 'INSERT' then
    select display_name into nm from public.profiles where id = new.user_id;
    perform public.notify_admins('application', 'New application: ' || t.title, coalesce(nm, 'A tasker') || ' applied.', '/admin/applications', 'app-' || new.id::text);
  elsif new.status <> old.status and new.status = 'accepted' then
    select id into asg from public.assignments where application_id = new.id limit 1;
    perform public.notify(new.user_id, 'application_approved', 'Application approved: ' || t.title, 'You can start onboarding now.',
      case when asg is null then '/projects' else '/projects/' || asg::text || '/onboarding' end, 'appok-' || new.id::text, 'application_approved',
      jsonb_build_object('projectTitle', t.title, 'summary', t.summary, 'rate', coalesce(new.agreed_rate, new.proposed_rate, t.hourly_rate), 'hours', t.estimated_hours, 'deadline', t.deadline, 'comment', new.reviewer_note));
  elsif new.status <> old.status and new.status = 'rejected' then
    perform public.notify(new.user_id, 'application_rejected', 'Application not selected: ' || t.title, coalesce(nullif(new.reviewer_note, ''), 'The administrator chose other applicants.'), '/marketplace',
      'appno-' || new.id::text, 'application_rejected', jsonb_build_object('projectTitle', t.title, 'comment', new.reviewer_note));
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';
