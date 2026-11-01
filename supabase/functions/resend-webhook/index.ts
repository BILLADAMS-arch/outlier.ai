// Receives Resend delivery events and records them on the outbox row. Add this function's URL as a webhook in the Resend dashboard.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Webhook } from 'npm:svix@1'

Deno.serve(async (req) => {
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET')
  if (!secret) return new Response('Not configured', { status: 500 })
  const raw = await req.text()
  let evt: { type: string; data: { email_id?: string; bounce?: { message?: string } } }
  try { evt = new Webhook(secret).verify(raw, { 'svix-id': req.headers.get('svix-id')!, 'svix-timestamp': req.headers.get('svix-timestamp')!, 'svix-signature': req.headers.get('svix-signature')! }) as typeof evt } catch { return new Response('Invalid signature', { status: 401 }) }
  const status = { 'email.delivered': 'delivered', 'email.bounced': 'bounced', 'email.complained': 'complained', 'email.delivery_delayed': 'delayed' }[evt.type]
  if (status && evt.data.email_id) {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await sb.from('email_outbox').update({ delivery_status: status, ...(status === 'bounced' ? { last_error: evt.data.bounce?.message ?? 'Bounced' } : {}) }).eq('provider_id', evt.data.email_id)
  }
  return new Response('ok')
})
