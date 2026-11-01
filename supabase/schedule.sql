-- OPTIONAL, run once AFTER deploying the Edge Functions and enabling the pg_cron and pg_net extensions
-- (Dashboard > Database > Extensions). Replace the three placeholders first.
--   <PROJECT_REF>   e.g. uviopkumykzfabzkeswc
--   <CRON_SECRET>   a long random string; set the SAME value as the CRON_SECRET Edge Function secret
select vault.create_secret('<CRON_SECRET>', 'cron_secret');

-- Every minute: deliver queued emails through Resend.
select cron.schedule('outlier-send-emails', '* * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb);
$$);

-- Every 15 minutes: reminders for unfinished work; Monday and the 1st also queue weekly and monthly statements.
select cron.schedule('outlier-jobs', '*/15 * * * *', $$ select public.run_scheduled_jobs(); $$);
