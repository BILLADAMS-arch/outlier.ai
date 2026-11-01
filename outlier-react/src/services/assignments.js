import { supabase, unwrap, rpc, currentUserId } from '../lib/supabase'

const TASK = 'tasks(id, title, category_id, image, difficulty, hourly_rate, estimated_hours)'
const SELECT = `*, ${TASK}`
// Admins can read every row through RLS, so "mine" must filter by user explicitly.
export const listMine = async () =>
  unwrap(await supabase.from('assignments').select(SELECT).eq('user_id', await currentUserId()).order('created_at', { ascending: false }))
export const listAll = async () => unwrap(await supabase.from('assignments').select(SELECT).order('created_at', { ascending: false }))

export const get = async (id) => unwrap(await supabase.from('assignments').select('*, tasks(*)').eq('id', id).maybeSingle())

export const recentSegments = async (limit = 8) =>
  unwrap(await supabase.from('time_segments').select('id, started_at, ended_at, assignments(id, tasks(title))').eq('user_id', await currentUserId()).order('started_at', { ascending: false }).limit(limit))
export const activeSegments = async () =>
  unwrap(await supabase.from('time_segments').select('id, user_id, started_at, assignment_id, assignments(tasks(title))').is('ended_at', null))

export const ackOnboarding = (id) => rpc('ack_onboarding', { p_assignment: id })
export const timerState = (id) => rpc('timer_state', { p_assignment: id })
export const startWork = (id) => rpc('start_work', { p_assignment: id })
export const pauseWork = (id) => rpc('pause_work', { p_assignment: id })
export const submitWork = (id, note, link) => rpc('submit_work', { p_assignment: id, p_note: note, p_link: link || null })
export const activeTimer = () => rpc('active_timer')

export const assignTask = (userId, taskId, rate) => rpc('assign_task', { p_user: userId, p_task: taskId, p_rate: rate ?? null })
export const cancel = (id, note) => rpc('cancel_assignment', { p_assignment: id, p_note: note || '' })
export const requestChanges = (id, note) => rpc('request_changes', { p_assignment: id, p_note: note })
export const approveWork = (id, seconds, note) => rpc('approve_work', { p_assignment: id, p_seconds: seconds, p_note: note || '' })

// Admin only (RLS): every working segment, used to total tracked time per project.
export const listSegments = async () => unwrap(await supabase.from('time_segments').select('id, assignment_id, user_id, started_at, ended_at'))
