import { supabase, unwrap, currentUserId } from '../lib/supabase'

// Admins can read every row through RLS, so "mine" must filter by user explicitly.
export const listMine = async () => unwrap(await supabase.from('payments').select('*').eq('user_id', await currentUserId()).order('created_at', { ascending: false }))
export const listAll = async () => unwrap(await supabase.from('payments').select('*').order('created_at', { ascending: false }))
export async function review(id, { status, reference, note }) {
  const row = { status, note: note || '' }
  if (reference != null) row.reference = reference
  return unwrap(await supabase.from('payments').update(row).eq('id', id))
}
