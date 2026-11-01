// Delivers queued emails from public.email_outbox through Resend. Invoked every minute by pg_cron (see supabase/schedule.sql).
// Retries failed sends with back-off (5 attempts), never sends the same outbox row twice (Idempotency-Key = row id).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { render } from '../_shared/templates.ts'
import { configFromEnv, EmailError, sendViaResend } from '../_shared/resend.ts'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Allowed callers: the scheduler (x-cron-secret) or any signed-in user's token. The caller supplies no content: the function only
// delivers rows that database triggers already queued, so letting the app "kick" it just makes delivery immediate.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const cron = Deno.env.get('CRON_SECRET')
  let allowed = !!cron && req.headers.get('x-cron-secret') === cron
  if (!allowed) {
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (jwt) { const { data } = await sb.auth.getUser(jwt); allowed = !!data?.user }
  }
  if (!allowed) return new Response('Forbidden', { status: 403, headers: CORS })
  const { data: settings } = await sb.from('app_settings').select('key, value').in('key', ['app_url', 'support_email'])
  const s = Object.fromEntries((settings || []).map((r) => [r.key, r.value]))
  const cfg = configFromEnv({ appUrl: s.app_url, supportEmail: s.support_email })

  const { data: rows, error } = await sb.rpc('claim_emails', { p_limit: 25 })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
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
    await sleep(550) // stay under Resend's 2 requests/second limit
  }
  return new Response(JSON.stringify({ claimed: rows?.length || 0, sent, failed }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})
