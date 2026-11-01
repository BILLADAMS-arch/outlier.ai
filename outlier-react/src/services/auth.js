import { supabase, unwrap } from '../lib/supabase'

export async function signUp({ fullName, email, password }) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() } } })
  if (error) throw new Error(error.message)
  return { needsConfirmation: !data.session }
}

export async function signIn({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message)
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
}
