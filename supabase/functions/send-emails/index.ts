// Delivers queued emails from public.email_outbox through Resend. Invoked every minute by pg_cron (see supabase/schedule.sql).
// Retries failed sends with back-off (5 attempts), never sends the same outbox row twice (Idempotency-Key = row id).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { render } from '../_shared/templates.ts'
import { configFromEnv, EmailError, sendViaResend } from '../_shared/resend.ts'

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET') || !Deno.env.get('CRON_SECRET')) return new Response('Forbidden', { status: 403 })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: settings } = await sb.from('app_settings').select('key, value').in('key', ['app_url', 'support_email'])
  const s = Object.fromEntries((settings || []).map((r) => [r.key, r.value]))
  const cfg = configFromEnv({ appUrl: s.app_url, supportEmail: s.support_email })

  const { data: rows, error } = await sb.rpc('claim_emails', { p_limit: 25 })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  let sent = 0, failed = 0
  for (const row of rows || []) {
    try {
      const mail = render(row.type, row.payload, cfg)
      const id = await sendViaResend({ to: row.to_email, subject: mail.subject, html: mail.html, text: mail.text, idempotencyKey: row.id, tags: { type: row.type } })
      await sb.from('email_outbox').update({ status: 'sent', provider_id: id, sent_at: new Date().toISOString(), last_error: null, subject: mail.subject, delivery_status: 'accepted' }).eq('id', row.id)
      sent++
    } catch (e) {
      // Permanent errors (bad address, unverified domain, bad key) are not retried; temporary ones back off 5, 10, 15, 20 minutes.
      const retryable = !(e instanceof EmailError) || e.retryable
      const dead = !retryable || row.attempts >= 5
      await sb.from('email_outbox').update({ status: dead ? 'dead' : 'failed', last_error: String((e as Error).message).slice(0, 500), next_attempt_at: new Date(Date.now() + row.attempts * 5 * 60_000).toISOString() }).eq('id', row.id)
      failed++
    }
  }
  return new Response(JSON.stringify({ claimed: rows?.length || 0, sent, failed }), { headers: { 'Content-Type': 'application/json' } })
})
