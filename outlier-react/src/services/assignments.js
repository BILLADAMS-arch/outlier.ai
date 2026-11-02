import { supabase, unwrap, rpc, currentUserId } from '../lib/supabase'
import { thenKick } from './mailer'

const TASK = 'tasks(id, title, category_id, image, difficulty, hourly_rate, estimated_hours, deadline, workspace_type, workspace_config, reference_links)'
const SELECT = `*, ${TASK}`
// Admins can read every row through RLS, so "mine" must filter by user explicitly.
// Attaches each project's saved progress so dashboards can show completion percentages.
async function withProgress(rows) {
  if (!rows.length) return rows
  const ws = unwrap(await supabase.from('workspaces').select('assignment_id, progress, updated_at').in('assignment_id', rows.map((r) => r.id)))
  return rows.map((r) => ({ ...r, workspace: ws.find((w) => w.assignmentId === r.id) || null }))
}
export const listMine = async () =>
  withProgress(unwrap(await supabase.from('assignments').select(SELECT).eq('user_id', await currentUserId()).order('created_at', { ascending: false })))
export const listAll = async () => withProgress(unwrap(await supabase.from('assignments').select(SELECT).order('created_at', { ascending: false })))

export const get = async (id) => unwrap(await supabase.from('assignments').select('*, tasks(*)').eq('id', id).maybeSingle())

export const recentSegments = async (limit = 8) =>
  unwrap(await supabase.from('time_segments').select('id, started_at, ended_at, assignments(id, tasks(title))').eq('user_id', await currentUserId()).order('started_at', { ascending: false }).limit(limit))
export const activeSegments = async () =>
  unwrap(await supabase.from('time_segments').select('id, user_id, started_at, assignment_id, assignments(tasks(title))').is('ended_at', null))

export const ackBriefing = (id) => rpc('ack_briefing', { p_assignment: id })
export const ackOnboarding = (id) => rpc('ack_onboarding', { p_assignment: id })
export const timerState = (id) => rpc('timer_state', { p_assignment: id })
export const startWork = (id) => rpc('start_work', { p_assignment: id })
export const heartbeat = (id) => rpc('heartbeat', { p_assignment: id })
export const pauseWork = (id) => rpc('pause_work', { p_assignment: id })
export const submitWork = (id, note, link) => rpc('submit_work', { p_assignment: id, p_note: note, p_link: link || null }).then(thenKick)
export const activeTimer = () => rpc('active_timer')

export const assignTask = (userId, taskId, rate) => rpc('assign_task', { p_user: userId, p_task: taskId, p_rate: rate ?? null }).then(thenKick)
export const cancel = (id, note) => rpc('cancel_assignment', { p_assignment: id, p_note: note || '' })
export const requestChanges = (id, note) => rpc('request_changes', { p_assignment: id, p_note: note }).then(thenKick)
export const approveWork = (id, seconds, note, reason) => rpc('approve_work', { p_assignment: id, p_seconds: seconds, p_note: note || '', p_reason: reason || '' }).then(thenKick)

// Admin only (RLS): every working segment, used to total tracked time per project.
export const listSegments = async () => unwrap(await supabase.from('time_segments').select('id, assignment_id, user_id, started_at, ended_at'))
