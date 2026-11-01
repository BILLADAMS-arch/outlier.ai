import { supabase, unwrap, rpc } from '../lib/supabase'
import { thenKick } from './mailer'

export const summary = (userId = null) => rpc('earnings_summary', { p_user: userId })
export const calendar = (userId = null) => rpc('payment_calendar', { p_user: userId })
export const statement = (from, to, userId = null) => rpc('earnings_statement', { p_user: userId, p_from: from, p_to: to })
export const rows = (from, to, bucket, userId = null) => rpc('earnings_rows', { p_user: userId, p_from: from, p_to: to, p_bucket: bucket })

export const listPayments = async (userId = null) => {
  let q = supabase.from('payments').select('*, assignments(task_id, tasks(title))').order('created_at', { ascending: false })
  if (userId) q = q.eq('user_id', userId)
  return unwrap(await q)
}
export async function updatePayment(id, { status, reference, note, failureReason }) {
  const row = { status }
  if (reference != null) row.reference = reference
  if (note != null) row.note = note
  if (failureReason != null) row.failure_reason = failureReason
  return thenKick(unwrap(await supabase.from('payments').update(row).eq('id', id)))
}
export const adjustPayment = (id, seconds, reason) => rpc('adjust_payment', { p_payment: id, p_seconds: seconds, p_reason: reason })
export const approveBatch = (cycle) => rpc('approve_payment_batch', { p_cycle: cycle }).then(thenKick)
export const startBatch = (cycle) => rpc('start_processing_batch', { p_cycle: cycle }).then(thenKick)
export const carryForward = (cycle) => rpc('carry_forward_cycle', { p_cycle: cycle }).then(thenKick)
export const listAdjustments = async () => unwrap(await supabase.from('earnings_adjustments').select('*').order('created_at', { ascending: false }).limit(100))
export const listTimeAdjustments = async () => unwrap(await supabase.from('time_adjustments').select('*').order('created_at', { ascending: false }).limit(100))
export const listSettings = async () => unwrap(await supabase.from('app_settings').select('key, value'))
export const setSetting = (key, value) => rpc('set_setting', { p_key: key, p_value: String(value) })
export const runJobs = () => rpc('admin_run_jobs').then(thenKick)
export const listSystemErrors = async () => unwrap(await supabase.from('system_errors').select('*').order('at', { ascending: false }).limit(50))
export const listOutbox = async () => unwrap(await supabase.from('email_outbox').select('id, to_email, type, subject, status, attempts, last_error, delivery_status, created_at, sent_at').order('created_at', { ascending: false }).limit(100))
