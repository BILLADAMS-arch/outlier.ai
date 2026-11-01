import { supabase, unwrap, rpc } from '../lib/supabase'

const COLS = 'id, display_name, email, role, account_status, review_note, created_at, reviewed_at'
export const listAll = async () => unwrap(await supabase.from('profiles').select(COLS).order('created_at', { ascending: false }))
export const reviewAccount = async (id, status, note) =>
  unwrap(await supabase.from('profiles').update({ account_status: status, review_note: note || '' }).eq('id', id))
export const publicStats = () => rpc('public_stats')
