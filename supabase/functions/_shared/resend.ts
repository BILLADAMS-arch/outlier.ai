// Thin Resend client. The API key is read from the function's environment and never leaves the server.
export async function sendViaResend(o: { to: string; subject: string; html: string; text: string; idempotencyKey: string; tags?: Record<string, string> }) {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  if (!key || !from) throw new Error('RESEND_API_KEY and EMAIL_FROM must be set as Edge Function secrets')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': o.idempotencyKey },
    body: JSON.stringify({ from, to: [o.to], subject: o.subject, html: o.html, text: o.text, tags: Object.entries(o.tags || {}).map(([name, value]) => ({ name, value })) }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body?.message || JSON.stringify(body)}`)
  return body.id as string
}

export function configFromEnv(over: Partial<{ appUrl: string; supportEmail: string }> = {}) {
  const appUrl = Deno.env.get('APP_URL') || over.appUrl || ''
  return {
    appUrl, supportEmail: Deno.env.get('SUPPORT_EMAIL') || over.supportEmail || '', brand: Deno.env.get('BRAND_NAME') || 'Outlier',
    logoUrl: Deno.env.get('LOGO_URL') || `${appUrl.replace(/\/$/, '')}/images/outlier.png`, otpMinutes: Number(Deno.env.get('OTP_EXPIRY_MINUTES') || 60),
  }
}
