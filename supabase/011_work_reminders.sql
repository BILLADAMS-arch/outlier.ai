-- On-demand "continue your work" reminders for taskers with ongoing (in progress) projects. Run AFTER 010. Safe to re-run.
-- Uses the existing notification + email pipeline (in-app notification and a 'reminder' email), one per ongoing project.
-- Account and work emails ignore the marketing opt-out. Re-running a campaign id never sends twice for the same project.
-- Redeploy send-emails afterwards (the reminder template gained a 'continue' reason).

create or replace function public.work_reminder_audience() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  return coalesce((select json_agg(json_build_object(
      'assignmentId', a.id, 'name', p.display_name, 'email', p.email, 'project', t.title, 'deadline', t.deadline,
      'lastActivity', (select max(greatest(s.started_at, coalesce(s.ended_at, s.last_heartbeat))) from public.time_segments s where s.assignment_id = a.id),
      'progress', public.workspace_percent(a.id)) order by p.display_name, t.title)
    from public.assignments a join public.profiles p on p.id = a.user_id join public.tasks t on t.id = a.task_id
    where a.status = 'in_progress' and p.email is not null), '[]'::json);
end $$;
revoke all on function public.work_reminder_audience() from public, anon;
grant execute on function public.work_reminder_audience() to authenticated;

create or replace function public.queue_work_reminders(p_campaign text, p_test boolean default true) returns json
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if coalesce(trim(p_campaign), '') = '' then raise exception 'A campaign id is required'; end if;
  for r in
    select a.id, a.user_id, t.title, t.deadline, w.updated_at as saved_at
    from public.assignments a join public.profiles p on p.id = a.user_id join public.tasks t on t.id = a.task_id
      left join public.workspaces w on w.assignment_id = a.id
    where a.status = 'in_progress' and p.email is not null and (not p_test or a.user_id = auth.uid())
  loop
    perform public.notify(r.user_id, 'reminder', 'Continue your project: ' || r.title,
      'Your work on this project is still open. Pick up where you left off.', '/workspace/project/' || r.id::text,
      'remx-' || p_campaign || '-' || r.id::text || case when p_test then '-test' else '' end, 'reminder',
      jsonb_build_object('projectTitle', r.title, 'status', 'in_progress', 'reason', 'continue', 'deadline', r.deadline,
        'remainingDays', case when r.deadline is null then null else (r.deadline - current_date) end,
        'lastSaved', r.saved_at, 'progressPercent', public.workspace_percent(r.id)));
    n := n + 1;
  end loop;
  return json_build_object('queued', n, 'test', p_test);
end $$;
revoke all on function public.queue_work_reminders(text, boolean) from public, anon;
grant execute on function public.queue_work_reminders(text, boolean) to authenticated;

notify pgrst, 'reload schema';
