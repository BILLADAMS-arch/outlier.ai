// Centralised mail sender built on the official Resend SDK. Runtime-agnostic: it receives its settings as arguments,
// so the same code runs in Supabase Edge Functions (Deno) and in tests. The API key never leaves the server.
import { Resend } from 'npm:resend@4'

export interface MailerEnv { RESEND_API_KEY?: string; EMAIL_FROM?: string; EMAIL_REPLY_TO?: string }
export interface Mail { to: string; subject: string; html: string; text: string; idempotencyKey: string; tags?: Record<string, string> }

/** An error from the mail provider. `retryable` is true for rate limits, timeouts and provider outages. */
export class EmailError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly code?: string, readonly status?: number) { super(message) }
}

// Resend error names that will never succeed on retry (bad address, unverified domain, invalid key, malformed request).
const PERMANENT = new Set(['validation_error', 'invalid_from_address', 'missing_required_field', 'invalid_idempotency_key', 'invalid_api_Key', 'invalid_api_key',
  'restricted_api_key', 'missing_api_key', 'invalid_access', 'invalid_parameter', 'invalid_attachment', 'not_found', 'method_not_allowed', 'invalid_region'])

export function createMailer(env: MailerEnv) {
  if (!env.RESEND_API_KEY) throw new EmailError('RESEND_API_KEY is not set as an Edge Function secret', false, 'missing_api_key')
  if (!env.EMAIL_FROM) throw new EmailError('EMAIL_FROM is not set as an Edge Function secret', false, 'missing_from')
  const client = new Resend(env.RESEND_API_KEY)
  const from = env.EMAIL_FROM
  const replyTo = env.EMAIL_REPLY_TO || undefined

  return {
    /** Sends one message. Resolves with Resend's message id. "Accepted" is not "delivered": delivery is confirmed by the webhook. */
    async send(m: Mail): Promise<string> {
      let res
      try {
        res = await client.emails.send({
          from, to: [m.to], subject: m.subject, html: m.html, text: m.text, replyTo,
          tags: Object.entries(m.tags || {}).map(([name, value]) => ({ name, value })),
        }, { idempotencyKey: m.idempotencyKey.slice(0, 256) })
      } catch (e) {
        throw new EmailError(`Could not reach Resend: ${(e as Error).message}`, true, 'network_error')
      }
      const { data, error } = res as { data: { id: string } | null; error: { name?: string; message: string; statusCode?: number } | null }
      if (error) {
        const permanent = PERMANENT.has(error.name || '') || (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429 && error.statusCode !== 409 && error.statusCode !== 408)
        throw new EmailError(`${error.name || 'resend_error'}: ${error.message}`, !permanent, error.name, error.statusCode)
      }
      if (!data?.id) throw new EmailError('Resend did not return a message id', true, 'no_id')
      return data.id
    },
  }
}
