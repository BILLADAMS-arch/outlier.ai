-- On-demand "inactive account" notice. Run AFTER 011. Safe to re-run.
-- Inactive = no sign-in and no logged work session for p_days days (accounts created inside the window are excluded; admins excluded).
-- Account notice, so it ignores the marketing opt-out. Re-running a campaign id never emails the same person twice.
-- Redeploy send-emails afterwards (new 'inactivity_notice' template).

create or replace function public.inactive_audience(p_days integer default 30) returns json
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
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
revoke all on function public.inactive_audience(integer) from public, anon;
grant execute on function public.inactive_audience(integer) to authenticated;

create or replace function public.queue_inactivity_notices(p_campaign text, p_days integer default 30, p_test boolean default true) returns json
language plpgsql security definer set search_path = public, auth as $$
declare r json; n integer := 0; d integer := greatest(p_days, 1); uid uuid; em text; nm text; la timestamptz;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if coalesce(trim(p_campaign), '') = '' then raise exception 'A campaign id is required'; end if;
  for r in select * from json_array_elements(public.inactive_audience(d)) loop
    uid := (r->>'userId')::uuid; em := r->>'email'; nm := r->>'name'; la := (r->>'lastActive')::timestamptz;
    if p_test and uid <> auth.uid() then continue; end if;
    perform public.notify(uid, 'reminder', 'Your account has been inactive',
      'Inactive accounts can be suspended or terminated. Sign in to keep your account active.', '/dashboard',
      'inact-' || p_campaign || '-' || uid::text, 'inactivity_notice',
      jsonb_build_object('days', d, 'lastActive', la));
    n := n + 1;
  end loop;
  if p_test and n = 0 then
    -- the calling admin is excluded from the audience, so preview with their own address
    select email, display_name into em, nm from public.profiles where id = auth.uid();
    perform public.notify(auth.uid(), 'reminder', 'Your account has been inactive',
      'Inactive accounts can be suspended or terminated. Sign in to keep your account active.', '/dashboard',
      'inact-' || p_campaign || '-' || auth.uid()::text || '-test', 'inactivity_notice',
      jsonb_build_object('days', d, 'lastActive', now() - make_interval(days => d)));
    n := 1;
  end if;
  return json_build_object('queued', n, 'test', p_test);
end $$;
revoke all on function public.queue_inactivity_notices(text, integer, boolean) from public, anon;
grant execute on function public.queue_inactivity_notices(text, integer, boolean) to authenticated;

notify pgrst, 'reload schema';
