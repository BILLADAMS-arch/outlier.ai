import { supabase, unwrap } from '../lib/supabase'

export async function signUp({ fullName, email, password }) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() } } })
  if (error) throw new Error(error.message)
  return { needsConfirmation: !data.session }
}

// "Remember me": when unticked, the session ends when the browser is closed (see AuthContext). The session itself is still
// issued, stored and refreshed by Supabase exactly as before.
export function markSession(remember = true) {
  try { localStorage.setItem('outlier.remember', remember ? '1' : '0'); sessionStorage.setItem('outlier.session', '1') } catch { /* storage unavailable: behave as remembered */ }
}
export const shouldEndSession = () => {
  try { return localStorage.getItem('outlier.remember') === '0' && !sessionStorage.getItem('outlier.session') } catch { return false }
}

export async function signIn({ email, password, remember = true }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message)
  markSession(remember)
}

export const signOut = () => supabase.auth.signOut()

export async function getProfile(userId) {
  return unwrap(
    await supabase.from('profiles').select('id, display_name, email, role, account_status, review_note, created_at').eq('id', userId).maybeSingle(),
  )
}

// One-time-code flows. The codes are emailed through Resend by the auth-email Edge Function (see supabase/DEPLOY.md).
export async function verifySignupCode({ email, code }) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' })
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'That code is invalid or has expired. Request a new one.' : error.message)
  markSession(true)
}
export async function resendSignupCode(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) throw new Error(error.message)
}
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw new Error(error.message)
}
export async function resetPasswordWithCode({ email, code, password }) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' })
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'That code is invalid or has expired. Request a new one.' : error.message)
  const { error: e2 } = await supabase.auth.updateUser({ password })
  if (e2) throw new Error(e2.message)
  markSession(true)
}
