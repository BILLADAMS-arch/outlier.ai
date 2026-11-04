import { supabase, rpc } from '../lib/supabase'
import { kickEmails } from './mailer'
import * as earningsApi from './earnings'

export const audience = () => rpc('promo_audience')
/** Queues the "available projects" email: to the calling admin only (test) or to every eligible account. */
export const queue = (campaign, subject, test) => rpc('queue_promo_projects', { p_campaign: campaign, p_subject: subject, p_test: test }).then((r) => { kickEmails(); return r })
export const getAddress = async () => (await earningsApi.listSettings()).find((s) => s.key === 'mailing_address')?.value || ''
export const setAddress = (value) => earningsApi.setSetting('mailing_address', value.trim())

export const reminderAudience = () => rpc('work_reminder_audience')
/** Queues a "continue working" reminder (in-app and email) for each ongoing project: to yourself only (test) or to every tasker. */
export const queueReminders = (campaign, test) => rpc('queue_work_reminders', { p_campaign: campaign, p_test: test }).then((r) => { kickEmails(); return r })

export const setOptOut = (optOut) => rpc('set_marketing_opt_out', { p_opt_out: optOut })
/** Public: the signed link in the email carries the user id and token. */
export async function unsubscribe(userId, token) {
  const { data, error } = await supabase.rpc('unsubscribe_marketing', { p_user: userId, p_token: token })
  if (error) throw new Error(error.message)
  return data === true
}
