// Supabase Auth "Send Email" hook. Sends the signup and password-reset one-time codes through Resend
// instead of Supabase's built-in mailer. Configure in Dashboard > Authentication > Hooks > Send Email (HTTPS).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { render } from '../_shared/templates.ts'
import { configFromEnv, sendViaResend } from '../_shared/resend.ts'

const fail = (status: number, message: string) => new Response(JSON.stringify({ error: { http_code: status, message } }), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const secret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') || '').replace('v1,whsec_', '')
  if (!secret) return fail(500, 'SEND_EMAIL_HOOK_SECRET is not configured')
  const raw = await req.text()
  let evt: { user: { id: string; email: string; user_metadata?: Record<string, string> }; email_data: { token: string; token_hash: string; email_action_type: string } }
  try { evt = new Webhook(secret).verify(raw, Object.fromEntries(req.headers)) as typeof evt } catch { return fail(401, 'Invalid signature') }

  const { user, email_data: d } = evt
  const type = d.email_action_type === 'signup' ? 'otp_signup' : d.email_action_type === 'recovery' ? 'otp_recovery' : null
  if (!type) return fail(400, `Unsupported email type: ${d.email_action_type}`)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const key = `auth-${type}-${d.token_hash}`
  // Log first: a retry of the same hook call finds the row and does not send twice.
  const { error: dup } = await sb.from('email_outbox').insert({ to_user: user.id, to_email: user.email, type, subject: 'One-time code', payload: {}, dedupe_key: key, status: 'sending', attempts: 1 })
  if (dup) return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
  try {
    const mail = render(type, { name: user.user_metadata?.full_name || '', token: d.token }, configFromEnv())
    const id = await sendViaResend({ to: user.email, subject: mail.subject, html: mail.html, text: mail.text, idempotencyKey: key.slice(0, 250), tags: { type } })
    await sb.from('email_outbox').update({ status: 'sent', provider_id: id, sent_at: new Date().toISOString(), subject: mail.subject, delivery_status: 'accepted' }).eq('dedupe_key', key)
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    await sb.from('email_outbox').update({ status: 'failed', last_error: String((e as Error).message).slice(0, 500) }).eq('dedupe_key', key)
    return fail(500, 'Could not send the verification email')
  }
})
