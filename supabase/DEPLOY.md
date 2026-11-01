# Deploying email, notifications and scheduled jobs

Run the SQL files in order in the Supabase SQL editor: `003`, `004_workspace.sql`, `005_notifications_email.sql`, `006_earnings.sql`.
Then, in the Settings screen of the admin area (or the SQL editor) set `app_url` (your site address) and `support_email`.

## 1. Resend
1. Create a Resend account, **verify a sending domain**, and create an API key.
2. Set the Edge Function secrets (Dashboard > Edge Functions > Secrets, or `supabase secrets set ...`). **Never commit these.**

| Secret | Value |
|---|---|
| `RESEND_API_KEY` | your Resend API key |
| `EMAIL_FROM` | e.g. `Outlier <no-reply@yourdomain.com>` (must be on the verified domain) |
| `APP_URL` | e.g. `https://your-site.vercel.app` |
| `SUPPORT_EMAIL` | your support address (shown in every email) |
| `CRON_SECRET` | long random string (same value as in `schedule.sql`) |
| `SEND_EMAIL_HOOK_SECRET` | the secret Supabase shows when you create the Send Email hook |
| `RESEND_WEBHOOK_SECRET` | the signing secret from the Resend webhook (optional, delivery status) |
| `OTP_EXPIRY_MINUTES` | text shown in OTP emails; set the same value in Auth > Providers > Email > "Email OTP Expiration" |

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

## 5. Delivery status (optional)
In Resend > Webhooks add `https://<PROJECT_REF>.supabase.co/functions/v1/resend-webhook` for delivered / bounced / complained events.

## Where to look when something does not arrive
`select type, to_email, status, attempts, last_error, delivery_status from email_outbox order by created_at desc;`
