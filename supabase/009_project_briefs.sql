-- Detailed project briefs. Run AFTER 008_task_pool.sql. Safe to re-run.
--
-- tasks.brief      structured brief sections (background, problem, scope, inputs, case data, acceptance criteria, milestones, submission).
--                  The existing description / objectives / instructions / deliverables / guidelines columns keep their meaning.
-- assignments.brief_ack_at   when the tasker confirmed they reviewed the briefing. Set by ack_onboarding (first start) or
--                  ack_briefing (projects started before briefs existed, or after an admin materially revises the brief).

alter table public.tasks add column if not exists brief jsonb not null default '{}'::jsonb
  check (jsonb_typeof(brief) = 'object');
alter table public.assignments add column if not exists brief_ack_at timestamptz;

create or replace function public.ack_onboarding(p_assignment uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_approved() then raise exception 'Your account is not approved'; end if;
  update public.assignments set onboarded_at = coalesce(onboarded_at, now()), brief_ack_at = coalesce(brief_ack_at, now())
    where id = p_assignment and user_id = auth.uid() and status in ('assigned','in_progress');
  if not found then raise exception 'Project not found or not open for work'; end if;
end $$;

create or replace function public.ack_briefing(p_assignment uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_approved() then raise exception 'Your account is not approved'; end if;
  update public.assignments set brief_ack_at = now()
    where id = p_assignment and user_id = auth.uid() and status in ('assigned','in_progress');
  if not found then raise exception 'Project not found or not open for work'; end if;
end $$;
revoke execute on function public.ack_briefing(uuid) from public, anon;
grant execute on function public.ack_briefing(uuid) to authenticated;

-- Admins can clear the acknowledgement for every open assignment of a project after a material change to its brief.
create or replace function public.request_briefing_review(p_task text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  update public.assignments set brief_ack_at = null where task_id = p_task and status in ('assigned','in_progress');
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.request_briefing_review(text) from public, anon;
grant execute on function public.request_briefing_review(text) to authenticated;

notify pgrst, 'reload schema';
