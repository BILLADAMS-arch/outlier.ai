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
  APP_URL=https://<your-site>.vercel.app CRON_SECRET=<long random string> OTP_EXPIRY_MINUTES=60
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
| `OTP_EXPIRY_MINUTES` | text shown in the code emails; set the same value in Auth > Providers > Email > "Email OTP Expiration" |

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
