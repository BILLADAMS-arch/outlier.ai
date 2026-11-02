-- Continuous project pool + reference links. Run AFTER 007_email_gaps.sql. Safe to re-run.
--
-- 1. reference_links: where a tasker reads up (kind 'reference') and which tools to use (kind 'tool'),
--    shown on the project page, in onboarding and in the workspace. Admins edit them per project.
--    New projects without links get sensible defaults for their category.
-- 2. refresh_task_pool(): keeps the marketplace stocked without anyone clicking anything.
--      a) published projects whose deadline has arrived are re-opened with a new deadline and a fresh posted date
--      b) up to task_drip_per_day draft projects are published each day, so new ones keep appearing
--    It runs from public.run_scheduled_jobs() (every 15 minutes) and is idempotent.

alter table public.tasks add column if not exists reference_links jsonb not null default '[]'::jsonb
  check (jsonb_typeof(reference_links) = 'array');

insert into public.app_settings (key, value) values
  ('task_refresh_days', '45'),     -- a re-opened or newly published project stays open this long (plus up to 14 days of spread)
  ('task_drip_per_day', '5')       -- draft projects published per day
on conflict (key) do nothing;

create or replace function public.default_reference_links(p_category text) returns jsonb
language sql immutable as $$
  select coalesce((select links from (values
    ('software', '[{"title": "Python documentation", "url": "https://docs.python.org/3/", "kind": "reference"}, {"title": "pytest documentation", "url": "https://docs.pytest.org/", "kind": "reference"}, {"title": "GitHub Docs", "url": "https://docs.github.com", "kind": "reference"}, {"title": "Replit online editor", "url": "https://replit.com", "kind": "tool"}]'::jsonb),
    ('web-mobile', '[{"title": "MDN Web Docs", "url": "https://developer.mozilla.org/", "kind": "reference"}, {"title": "React documentation", "url": "https://react.dev", "kind": "reference"}, {"title": "web.dev Learn", "url": "https://web.dev/learn", "kind": "reference"}]'::jsonb),
    ('design', '[{"title": "Figma Help Center", "url": "https://help.figma.com", "kind": "reference"}, {"title": "Figma (design tool)", "url": "https://www.figma.com", "kind": "tool"}]'::jsonb),
    ('marketing', '[{"title": "Google Search Central", "url": "https://developers.google.com/search/docs", "kind": "reference"}, {"title": "Google Analytics Help", "url": "https://support.google.com/analytics", "kind": "reference"}, {"title": "HubSpot Academy", "url": "https://academy.hubspot.com", "kind": "reference"}, {"title": "Google Trends", "url": "https://trends.google.com", "kind": "tool"}]'::jsonb),
    ('writing', '[{"title": "Purdue OWL writing lab", "url": "https://owl.purdue.edu", "kind": "reference"}, {"title": "Google developer documentation style guide", "url": "https://developers.google.com/style", "kind": "reference"}, {"title": "Hemingway Editor", "url": "https://hemingwayapp.com", "kind": "tool"}]'::jsonb),
    ('data', '[{"title": "pandas documentation", "url": "https://pandas.pydata.org/docs/", "kind": "reference"}, {"title": "Kaggle Learn", "url": "https://www.kaggle.com/learn", "kind": "reference"}, {"title": "Google Sheets Help", "url": "https://support.google.com/docs", "kind": "reference"}, {"title": "Google Sheets", "url": "https://sheets.google.com", "kind": "tool"}]'::jsonb),
    ('virtual-assistance', '[{"title": "Google Workspace user guides", "url": "https://support.google.com/a/users", "kind": "reference"}, {"title": "Notion Help Center", "url": "https://www.notion.so/help", "kind": "reference"}, {"title": "Google Calendar", "url": "https://calendar.google.com", "kind": "tool"}]'::jsonb),
    ('customer-support', '[{"title": "Zendesk customer service blog", "url": "https://www.zendesk.com/blog/", "kind": "reference"}, {"title": "Help Scout resources", "url": "https://www.helpscout.com/resources/", "kind": "reference"}, {"title": "HubSpot Academy", "url": "https://academy.hubspot.com", "kind": "reference"}]'::jsonb),
    ('translation', '[{"title": "W3C Internationalization", "url": "https://www.w3.org/International/", "kind": "reference"}, {"title": "Linguee dictionary", "url": "https://www.linguee.com", "kind": "reference"}, {"title": "Google Translate (for checking)", "url": "https://translate.google.com", "kind": "tool"}, {"title": "Audacity audio editor", "url": "https://www.audacityteam.org", "kind": "tool"}]'::jsonb),
    ('video-photo', '[{"title": "DaVinci Resolve training", "url": "https://www.blackmagicdesign.com/products/davinciresolve/training", "kind": "reference"}, {"title": "DaVinci Resolve (free editor)", "url": "https://www.blackmagicdesign.com/products/davinciresolve", "kind": "tool"}]'::jsonb),
    ('accounting', '[{"title": "IRS small business and self-employed", "url": "https://www.irs.gov/businesses/small-businesses-self-employed", "kind": "reference"}, {"title": "AccountingCoach", "url": "https://www.accountingcoach.com", "kind": "reference"}, {"title": "Google Sheets", "url": "https://sheets.google.com", "kind": "tool"}]'::jsonb),
    ('research-consulting', '[{"title": "Google Scholar", "url": "https://scholar.google.com", "kind": "tool"}, {"title": "Purdue OWL research guides", "url": "https://owl.purdue.edu", "kind": "reference"}, {"title": "Google Docs", "url": "https://docs.google.com", "kind": "tool"}]'::jsonb),
    ('ai-ml', '[{"title": "scikit-learn documentation", "url": "https://scikit-learn.org/stable/", "kind": "reference"}, {"title": "Hugging Face learn", "url": "https://huggingface.co/learn", "kind": "reference"}, {"title": "Google Machine Learning Crash Course", "url": "https://developers.google.com/machine-learning/crash-course", "kind": "reference"}, {"title": "Google Colab notebooks", "url": "https://colab.research.google.com", "kind": "tool"}]'::jsonb),
    ('education', '[{"title": "Khan Academy", "url": "https://www.khanacademy.org", "kind": "reference"}, {"title": "MIT OpenCourseWare", "url": "https://ocw.mit.edu", "kind": "reference"}, {"title": "Google Docs", "url": "https://docs.google.com", "kind": "tool"}]'::jsonb),
    ('engineering', '[{"title": "The Engineering ToolBox", "url": "https://www.engineeringtoolbox.com", "kind": "reference"}, {"title": "MIT OpenCourseWare", "url": "https://ocw.mit.edu", "kind": "reference"}, {"title": "Desmos graphing calculator", "url": "https://www.desmos.com/calculator", "kind": "tool"}]'::jsonb),
    ('sales', '[{"title": "HubSpot Academy", "url": "https://academy.hubspot.com", "kind": "reference"}, {"title": "Salesforce Trailhead", "url": "https://trailhead.salesforce.com", "kind": "reference"}]'::jsonb),
    ('hr', '[{"title": "SHRM toolkits and resources", "url": "https://www.shrm.org/topics-tools", "kind": "reference"}, {"title": "Google Docs", "url": "https://docs.google.com", "kind": "tool"}]'::jsonb),
    ('cybersecurity', '[{"title": "OWASP Top Ten", "url": "https://owasp.org/www-project-top-ten/", "kind": "reference"}, {"title": "NIST Cybersecurity Framework", "url": "https://www.nist.gov/cyberframework", "kind": "reference"}]'::jsonb),
    ('project-management', '[{"title": "Atlassian Agile Coach", "url": "https://www.atlassian.com/agile", "kind": "reference"}, {"title": "Trello boards", "url": "https://trello.com", "kind": "tool"}]'::jsonb),
    ('architecture-cad', '[{"title": "FreeCAD documentation", "url": "https://wiki.freecad.org", "kind": "reference"}, {"title": "FreeCAD (free CAD tool)", "url": "https://www.freecad.org", "kind": "tool"}]'::jsonb)
  ) as d(cat, links) where cat = p_category), '[]'::jsonb)
$$;

create or replace function public.tasks_default_links() returns trigger language plpgsql as $$
begin
  if new.reference_links is null or new.reference_links = '[]'::jsonb then
    new.reference_links := public.default_reference_links(new.category_id);
  end if;
  return new;
end $$;
drop trigger if exists tasks_default_links on public.tasks;
create trigger tasks_default_links before insert on public.tasks for each row execute function public.tasks_default_links();

update public.tasks set reference_links = public.default_reference_links(category_id) where reference_links = '[]'::jsonb;

create or replace function public.refresh_task_pool() returns json
language plpgsql security definer set search_path = public as $$
declare days integer := public.setting_int('task_refresh_days', 45); per_day integer := public.setting_int('task_drip_per_day', 5);
        reopened integer := 0; dripped integer := 0; last_drip text;
begin
  -- a) re-open expired projects; the per-project offset spreads deadlines so they do not all expire together
  update public.tasks set deadline = current_date + days + (abs(hashtext(id)) % 15), posted_at = current_date
    where status = 'published' and deadline is not null and deadline <= current_date;
  get diagnostics reopened = row_count;

  -- b) publish the next drafts, once a day
  select value into last_drip from public.app_settings where key = 'last_task_drip';
  if last_drip is distinct from current_date::text then
    with next as (select id from public.tasks where status = 'draft' order by posted_at, title limit per_day)
    update public.tasks t set status = 'published', posted_at = current_date, deadline = current_date + days + (abs(hashtext(t.id)) % 15)
      from next where t.id = next.id;
    get diagnostics dripped = row_count;
    insert into public.app_settings (key, value) values ('last_task_drip', current_date::text)
      on conflict (key) do update set value = excluded.value;
  end if;
  return json_build_object('reopened', reopened, 'published_from_drafts', dripped);
end $$;
revoke all on function public.refresh_task_pool() from public, anon, authenticated;
grant execute on function public.refresh_task_pool() to service_role;

create or replace function public.run_scheduled_jobs() returns json
language plpgsql security definer set search_path = public as $$
declare r integer; s integer; p json;
begin
  r := public.enqueue_reminders();
  s := public.enqueue_statements();
  p := public.refresh_task_pool();
  return json_build_object('reminders', r, 'statements', s, 'tasks', p, 'at', now());
end $$;
revoke all on function public.run_scheduled_jobs() from public, anon, authenticated;
grant execute on function public.run_scheduled_jobs() to service_role;

-- Run once now so nothing sits expired until the next scheduled tick.
select public.refresh_task_pool();

notify pgrst, 'reload schema';
