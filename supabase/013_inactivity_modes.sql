-- Adds an audience mode to the inactivity notice. Run AFTER 012. Safe to re-run.
--   'inactive'      no sign-in and no logged work for p_days days (as before)
--   'never_worked'  has signed in at least once but has never logged any work session (p_days ignored)
-- Redeploy send-emails afterwards (the template wording depends on the mode).

drop function if exists public.inactive_audience(integer);
drop function if exists public.queue_inactivity_notices(text, integer, boolean);

create or replace function public.inactive_audience(p_days integer default 30, p_mode text default 'inactive') returns json
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if p_mode = 'never_worked' then
    return coalesce((select json_agg(json_build_object('userId', p.id, 'name', p.display_name, 'email', p.email, 'lastActive', u.last_sign_in_at,
        'days', (current_date - u.last_sign_in_at::date)) order by u.last_sign_in_at)
      from public.profiles p join auth.users u on u.id = p.id
      where p.role <> 'admin' and p.email is not null and u.last_sign_in_at is not null
        and not exists (select 1 from public.time_segments s join public.assignments a on a.id = s.assignment_id where a.user_id = p.id)), '[]'::json);
  end if;
  return coalesce((select json_agg(json_build_object('userId', x.id, 'name', x.display_name, 'email', x.email, 'lastActive', x.last_active,
      'days', (current_date - x.last_active::date)) order by x.last_active)
    from (
      select p.id, p.display_name, p.email,
        greatest(p.created_at, coalesce(u.last_sign_in_at, p.created_at),
          coalesce((select max(greatest(s.started_at, coalesce(s.ended_at, s.last_heartbeat))) from public.time_segments s join public.assignments a on a.id = s.assignment_id where a.user_id = p.id), p.created_at)) as last_active
      from public.profiles p left join auth.users u on u.id = p.id
      where p.role <> 'admin' and p.email is not null
    ) x where x.last_active < now() - make_interval(days => greatest(p_days, 1))), '[]'::json);
end $$;
revoke all on function public.inactive_audience(integer, text) from public, anon;
grant execute on function public.inactive_audience(integer, text) to authenticated;

create or replace function public.queue_inactivity_notices(p_campaign text, p_days integer default 30, p_test boolean default true, p_mode text default 'inactive') returns json
language plpgsql security definer set search_path = public, auth as $$
declare r json; n integer := 0; d integer := greatest(p_days, 1); uid uuid; la timestamptz;
  v_mode text := case when p_mode = 'never_worked' then 'never_worked' else 'inactive' end;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if coalesce(trim(p_campaign), '') = '' then raise exception 'A campaign id is required'; end if;
  for r in select * from json_array_elements(public.inactive_audience(d, v_mode)) loop
    uid := (r->>'userId')::uuid; la := (r->>'lastActive')::timestamptz;
    if p_test and uid <> auth.uid() then continue; end if;
    perform public.notify(uid, 'reminder', 'Your account has been inactive',
      'Inactive accounts can be suspended or terminated. Sign in and start a project to keep your account active.', '/dashboard',
      'inact-' || p_campaign || '-' || uid::text, 'inactivity_notice',
      jsonb_build_object('days', d, 'lastActive', la, 'mode', v_mode));
    n := n + 1;
  end loop;
  if p_test and n = 0 then
    -- the calling admin is excluded from the audience, so preview with their own address
    perform public.notify(auth.uid(), 'reminder', 'Your account has been inactive',
      'Inactive accounts can be suspended or terminated. Sign in and start a project to keep your account active.', '/dashboard',
      'inact-' || p_campaign || '-' || auth.uid()::text || '-test', 'inactivity_notice',
      jsonb_build_object('days', d, 'lastActive', now() - make_interval(days => d), 'mode', v_mode));
    n := 1;
  end if;
  return json_build_object('queued', n, 'test', p_test, 'mode', v_mode);
end $$;
revoke all on function public.queue_inactivity_notices(text, integer, boolean, text) from public, anon;
grant execute on function public.queue_inactivity_notices(text, integer, boolean, text) to authenticated;

notify pgrst, 'reload schema';
