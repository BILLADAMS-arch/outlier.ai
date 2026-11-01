// Edge Function glue: builds the mailer and the template configuration from the function's environment (secrets).
import { createMailer, type Mail } from './mailer.ts'
export { EmailError } from './mailer.ts'

declare const Deno: { env: { get(k: string): string | undefined } }

let mailer: ReturnType<typeof createMailer> | null = null
export function sendViaResend(m: Mail) {
  mailer ||= createMailer({ RESEND_API_KEY: Deno.env.get('RESEND_API_KEY'), EMAIL_FROM: Deno.env.get('EMAIL_FROM'), EMAIL_REPLY_TO: Deno.env.get('EMAIL_REPLY_TO') })
  return mailer.send(m)
}

export function configFromEnv(over: Partial<{ appUrl: string; supportEmail: string }> = {}) {
  const appUrl = Deno.env.get('APP_URL') || over.appUrl || ''
  return {
    appUrl,
    supportEmail: Deno.env.get('SUPPORT_EMAIL') || over.supportEmail || Deno.env.get('EMAIL_REPLY_TO') || 'support@outlier.cfd',
    brand: Deno.env.get('BRAND_NAME') || 'Outlier',
    logoUrl: Deno.env.get('LOGO_URL') || `${appUrl.replace(/\/$/, '')}/images/outlier.png`,
    otpMinutes: Number(Deno.env.get('OTP_EXPIRY_MINUTES') || 5),
  }
}
