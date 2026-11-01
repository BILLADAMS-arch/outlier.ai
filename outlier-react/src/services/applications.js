import { supabase, unwrap, currentUserId } from '../lib/supabase'

const COLS = '*, tasks(title)'
// Admins can read every row through RLS, so "mine" must filter by user explicitly.
export const listMine = async () => unwrap(await supabase.from('applications').select(COLS).eq('user_id', await currentUserId()).order('created_at', { ascending: false }))
export const listAll = async () => unwrap(await supabase.from('applications').select(COLS).order('created_at', { ascending: false }))

export async function apply({ taskId, note, availability, proposedRate }) {
  const { error } = await supabase.from('applications').insert({ task_id: taskId, note, availability, proposed_rate: proposedRate })
  if (error?.code === '23505') throw new Error('You have already applied to this project.')
  if (error) throw new Error(error.message)
}
export const withdraw = async (id) => unwrap(await supabase.from('applications').update({ status: 'withdrawn' }).eq('id', id))

export async function review(id, { status, reviewerNote, agreedRate }) {
  const row = { status, reviewer_note: reviewerNote || '' }
  if (agreedRate != null) row.agreed_rate = agreedRate
  return unwrap(await supabase.from('applications').update(row).eq('id', id))
}
