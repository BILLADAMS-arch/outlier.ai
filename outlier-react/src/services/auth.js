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
