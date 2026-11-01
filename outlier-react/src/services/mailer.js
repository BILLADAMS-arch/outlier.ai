import { supabase } from '../lib/supabase'

// Emails are queued by database triggers the moment a real event succeeds (approval, assignment, submission, payment...).
// "Kicking" asks the server-side send-emails function to deliver whatever is queued right now instead of waiting for the
// next scheduled run. The browser never supplies email content and never holds an email key: the function only sends
// rows that already exist in the outbox, so repeated or concurrent kicks cannot cause duplicates.
const GAP_MS = 3000
let last = 0
let timer = null
let running = false

async function run() {
  if (running) return
  running = true
  last = Date.now()
  try {
    const { error } = await supabase.functions.invoke('send-emails', { body: {} })
    if (error) console.warn('[email] delivery run failed:', error.message)
  } catch (e) {
    console.warn('[email] delivery run failed:', e.message)
  } finally {
    running = false
  }
}

export function kickEmails() {
  const wait = last + GAP_MS - Date.now()
  if (wait <= 0 && !running) { run(); return }
  clearTimeout(timer)
  timer = setTimeout(run, Math.max(wait, 500)) // one trailing run so nothing queued in the meantime is left waiting
}

/** Use as .then(thenKick) after a mutation: passes the result through and triggers a delivery run. */
export const thenKick = (value) => { kickEmails(); return value }
