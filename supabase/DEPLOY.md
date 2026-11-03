# Deploying email, notifications and scheduled jobs

Run the SQL files in order in the Supabase SQL editor: `003`, `004_workspace.sql`, `005_notifications_email.sql`, `006_earnings.sql`.
Then, in the Settings screen of the admin area (or the SQL editor) set `app_url` (your site address) and `support_email`.

## 1. Resend (sender domain `outlier.cfd` is verified)
Secrets live only in Supabase (Dashboard > Edge Functions > Secrets, or the CLI). They are never in the repository or the front end.

```
supabase login
supabase link --project-ref uviopkumykzfabzkeswc
supabase secrets set RESEND_API_KEY=<your Resend key> \
  EMAIL_FROM="Outlier <support@outlier.cfd>" EMAIL_REPLY_TO=support@outlier.cfd SUPPORT_EMAIL=support@outlier.cfd \
  APP_URL=https://outlier.cfd CRON_SECRET=<long random string> OTP_EXPIRY_MINUTES=5
```
Add later: `SEND_EMAIL_HOOK_SECRET` (shown when you create the Auth hook, step 3) and `RESEND_WEBHOOK_SECRET` (shown when you create the Resend webhook, step 5).
Rotate the Resend key in the Resend dashboard whenever it has been shared, then run `supabase secrets set RESEND_API_KEY=...` again.

| Secret | Value |
|---|---|
| `RESEND_API_KEY` | your Resend API key |
| `EMAIL_FROM` | `Outlier <support@outlier.cfd>` (must be on the verified domain) |
| `EMAIL_REPLY_TO` | `support@outlier.cfd` |
| `SUPPORT_EMAIL` | shown in the email footer |
| `APP_URL` | your site address, used for every link in emails |
| `CRON_SECRET` | long random string (same value as in `schedule.sql`) |
| `SEND_EMAIL_HOOK_SECRET` | from the Supabase Send Email hook |
| `RESEND_WEBHOOK_SECRET` | from the Resend webhook (`whsec_...`) |
| `OTP_EXPIRY_MINUTES` | `5`. Text shown in the code emails; must match the Supabase expiry (300 seconds, below) |

## 2. Deploy the functions
```
supabase functions deploy send-emails --no-verify-jwt
supabase functions deploy auth-email --no-verify-jwt
supabase functions deploy resend-webhook --no-verify-jwt
```

## 3. OTP emails through Resend
Dashboard > Authentication > Hooks > **Send Email** > HTTPS > URL `https://<PROJECT_REF>.supabase.co/functions/v1/auth-email`.
Keep "Confirm email" ON (Authentication > Providers > Email) so accounts stay inactive until the code is entered.
Set the email template/OTP length as you prefer; the app asks for the code on the sign-in screen.

## 4. Scheduling
Enable `pg_cron` and `pg_net` (Database > Extensions), edit and run `supabase/schedule.sql`.

## 5. Delivery status (webhook)
In Resend > Webhooks > Add endpoint: `https://uviopkumykzfabzkeswc.supabase.co/functions/v1/resend-webhook`, events `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.suppressed`.
Copy its signing secret into `RESEND_WEBHOOK_SECRET`. Until this is done the outbox shows `accepted` (Resend took the message) but never `delivered`.

## Where to look when something does not arrive
`select type, to_email, status, attempts, last_error, delivery_status from email_outbox order by created_at desc;`


## One-time codes: 6 digits, 5 minutes
Dashboard > **Authentication > Sign In / Providers > Email**:
- **Email OTP Length** = `6` (the app now accepts exactly six digits; set this BEFORE deploying the new front end, or existing 8-digit codes will be rejected).
- **Email OTP Expiration** = `300` (seconds).
- Keep **Confirm email** on. Rate limits (Authentication > Rate Limits) are not changed by anything in this repository.

Because the Send Email hook is on, the emails are rendered by the `auth-email` function and the code comes from the hook payload (`email_data.token`), so the templates in the Supabase dashboard are not used.
If you ever turn the hook off, paste `supabase/auth-templates/confirm-signup.html` into *Authentication > Email Templates > Confirm signup* and `reset-password.html` into *Reset password*. Both print the code with Supabase's `{{ .Token }}` variable.

## Why queued emails did not arrive (audit result)
Database triggers queue every event email (welcome, approvals, assignments, submissions, reviews, payments, reminders). Something must then run `send-emails`. Two things do:
1. **The app**: after each real event (and when someone signs in) it asks `send-emails` to deliver the queue immediately. Requires redeploying `send-emails` (it now accepts a signed-in user's token as well as the cron secret).
2. **The schedule**: `supabase/schedule.sql` (pg_cron + pg_net) runs it every minute and also queues reminders and statements. Without it, reminders and the Monday/1st statements never fire and a stuck queue is only flushed when someone uses the app.

Check anytime in Admin > Settings: the *Email delivery log* shows queued/sent/failed rows, *Notification errors* shows events that could not queue an email.

## Continuous project pool and reference links (008)

Run `supabase/008_task_pool.sql` in the SQL editor **before** deploying the app version that reads `reference_links`.
It adds per-project reference links (with category defaults) and `refresh_task_pool()`, which the existing `outlier-jobs` cron
(`run_scheduled_jobs`, every 15 minutes) calls: expired published projects are re-opened with a new deadline, and up to
`task_drip_per_day` (default 5) draft projects are published each day. Tune with the `task_refresh_days` and `task_drip_per_day` settings.
Check it with `select public.refresh_task_pool();` and `select * from cron.job_run_details order by start_time desc limit 5;`.

## Promotional email (010)

1. Run `supabase/010_promo_email.sql` (needs the `cron_secret` Vault entry from `schedule.sql`; the unsubscribe token is derived from it).
2. Redeploy the sender: `supabase functions deploy send-emails --no-verify-jwt` (new `promo_projects` template and List-Unsubscribe headers).
3. In the app: Admin > Announcements. Save the postal address, send a test to yourself, then send to everyone.
Opted-out accounts are skipped; re-running a campaign id never emails the same person twice. Transactional email ignores the opt-out.
