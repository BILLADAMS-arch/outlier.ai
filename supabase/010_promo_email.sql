-- Promotional email: a marketing opt-out, one-click unsubscribe, and an admin-triggered "available projects" campaign.
-- Run AFTER 009_project_briefs.sql. Safe to re-run. Then redeploy the send-emails Edge Function (new template and headers).
--
-- Promotional email must carry an unsubscribe link and a postal address (US CAN-SPAM). Transactional email (codes,
-- approvals, statements) is unaffected by the opt-out.

alter table public.profiles add column if not exists marketing_opt_out boolean not null default false;

-- Unsubscribe tokens are derived from the user id with the project's cron secret, so nothing is stored or exposed.
create or replace function public._unsub_token(p_user uuid) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare s text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'cron_secret';
  if s is null then raise exception 'cron_secret is not set in Vault (see schedule.sql)'; end if;
  return encode(extensions.hmac(p_user::text, s, 'sha256'), 'hex');
end $$;
revoke all on function public._unsub_token(uuid) from public, anon, authenticated;

-- Public (no sign-in): the link in the email carries the user id and token.
create or replace function public.unsubscribe_marketing(p_user uuid, p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_token is distinct from public._unsub_token(p_user) then return false; end if;
  update public.profiles set marketing_opt_out = true where id = p_user;
  return found;
end $$;
revoke all on function public.unsubscribe_marketing(uuid, text) from public;
grant execute on function public.unsubscribe_marketing(uuid, text) to anon, authenticated;

create or replace function public.set_marketing_opt_out(p_opt_out boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.profiles set marketing_opt_out = p_opt_out where id = auth.uid();
end $$;
revoke all on function public.set_marketing_opt_out(boolean) from public, anon;
grant execute on function public.set_marketing_opt_out(boolean) to authenticated;

-- Who would receive a campaign: everyone with an email who has not opted out.
create or replace function public.promo_audience() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  return (select json_build_object(
    'eligible', count(*) filter (where email is not null and not marketing_opt_out),
    'approved', count(*) filter (where email is not null and not marketing_opt_out and account_status = 'approved'),
    'optedOut', count(*) filter (where marketing_opt_out),
    'noEmail', count(*) filter (where email is null)) from public.profiles);
end $$;
revoke all on function public.promo_audience() from public, anon;
grant execute on function public.promo_audience() to authenticated;

-- Queues one promotional email per recipient (or just to the calling admin when p_test is true). Re-running the same
-- campaign id never sends twice to the same person. Needs the app setting 'mailing_address'.
create or replace function public.queue_promo_projects(p_campaign text, p_subject text, p_test boolean default true) returns json
language plpgsql security definer set search_path = public as $$
declare addr text; projects jsonb; total integer; r record; n integer := 0; base text;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  if coalesce(trim(p_campaign), '') = '' or coalesce(trim(p_subject), '') = '' then raise exception 'A campaign id and subject are required'; end if;
  select value into addr from public.app_settings where key = 'mailing_address';
  if coalesce(trim(addr), '') = '' then raise exception 'Set the postal address first: promotional email must show one'; end if;
  select value into base from public.app_settings where key = 'app_url';

  select count(*) into total from public.tasks where status = 'published' and (deadline is null or deadline >= current_date);
  if total = 0 then raise exception 'There are no open projects to promote'; end if;
  -- six projects: the best-paying open project of each of the six most recently refreshed categories
  select coalesce(jsonb_agg(p order by p.rate desc), '[]'::jsonb) into projects from (
    select * from (
      select distinct on (t.category_id) t.id, t.title, c.name as category, t.hourly_rate as rate, t.estimated_hours as hours, t.difficulty,
             t.posted_at, left(t.summary, 140) as summary
      from public.tasks t join public.categories c on c.id = t.category_id
      where t.status = 'published' and (t.deadline is null or t.deadline >= current_date)
      order by t.category_id, t.posted_at desc, t.hourly_rate desc
    ) x order by posted_at desc, rate desc limit 6
  ) p;

  for r in
    select id, email, coalesce(nullif(split_part(display_name, ' ', 1), ''), 'there') as first, account_status
    from public.profiles
    where email is not null and not marketing_opt_out and (not p_test or id = auth.uid())
  loop
    perform public.queue_email(r.id, r.email, 'promo_projects', p_subject,
      jsonb_build_object('subject', p_subject, 'name', r.first, 'approved', r.account_status = 'approved', 'total', total, 'projects', projects,
        'unsubscribeUrl', coalesce(nullif(base, ''), 'https://outlier.cfd') || '/unsubscribe?u=' || r.id || '&t=' || public._unsub_token(r.id),
        'address', addr),
      p_campaign, case when p_test then 'promo-test:' || p_campaign || ':' || r.id else 'promo:' || p_campaign || ':' || r.id end);
    n := n + 1;
  end loop;
  return json_build_object('queued', n, 'test', p_test, 'projects', jsonb_array_length(projects), 'openProjects', total);
end $$;
revoke all on function public.queue_promo_projects(text, text, boolean) from public, anon;
grant execute on function public.queue_promo_projects(text, text, boolean) to authenticated;

notify pgrst, 'reload schema';
