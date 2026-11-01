import { supabase, unwrap, rpc } from '../lib/supabase'

export const listNotifications = async (limit = 40) =>
  unwrap(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit))
export const markRead = (ids = null) => rpc('mark_notifications_read', { p_ids: ids })
