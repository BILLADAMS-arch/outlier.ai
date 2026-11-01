import { supabase, unwrap } from '../lib/supabase'

export const listMine = async () => unwrap(await supabase.from('payments').select('*').order('created_at', { ascending: false }))
export const listAll = listMine // admins receive every payment through RLS
export async function review(id, { status, reference, note }) {
  const row = { status, note: note || '' }
  if (reference != null) row.reference = reference
  return unwrap(await supabase.from('payments').update(row).eq('id', id))
}
