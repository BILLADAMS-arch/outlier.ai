import { supabase, unwrap, rpc, camel, currentUserId } from '../lib/supabase'
import { thenKick } from './mailer'

export const getWorkspace = (assignmentId) => rpc('get_workspace', { p_assignment: assignmentId })
export const saveWorkspace = (assignmentId, { data, progress, notes }, baseVersion, kind = 'auto') =>
  rpc('save_workspace', { p_assignment: assignmentId, p_data: data, p_progress: progress, p_notes: notes, p_base_version: baseVersion, p_kind: kind })
export const heartbeat = (assignmentId) => rpc('heartbeat', { p_assignment: assignmentId })

export const listVersions = async (workspaceId) =>
  unwrap(await supabase.from('workspace_versions').select('id, version, revision, kind, created_at, data, progress, notes').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50))

export const listSegmentsFor = async (assignmentId) =>
  unwrap(await supabase.from('time_segments').select('id, started_at, ended_at, last_heartbeat').eq('assignment_id', assignmentId).order('started_at', { ascending: false }))

export const listFiles = async (assignmentId) =>
  unwrap(await supabase.from('workspace_files').select('*').eq('assignment_id', assignmentId).is('removed_at', null).order('created_at', { ascending: false }))

export const listResources = async (taskId) => unwrap(await supabase.from('project_resources').select('*').eq('task_id', taskId).order('created_at'))

/** Time-limited link to a private file. Nothing in these buckets is publicly readable. */
export async function signedUrl(bucket, path, seconds = 600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

const safeName = (n) => n.replace(/[^\w.\- ]+/g, '_').slice(0, 120)
/** Uploads to the private bucket, then records the file through the server function (which re-checks ownership and lock state). */
export async function uploadFile({ assignmentId, kind, slot, file }) {
  const userId = await currentUserId()
  if (file.size > 25 * 1024 * 1024) throw new Error('Files can be at most 25 MB.')
  const path = `${userId}/${assignmentId}/${crypto.randomUUID()}-${safeName(file.name)}`
  const { error } = await supabase.storage.from('workspace-files').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) throw new Error(error.message)
  return camel(await rpc('register_file', { p_assignment: assignmentId, p_kind: kind, p_slot: slot || null, p_name: file.name.slice(0, 200), p_path: path, p_size: file.size, p_mime: file.type || 'application/octet-stream' }))
}
export const removeFile = (id) => rpc('remove_file', { p_file: id })

export async function uploadResource(taskId, file, kind, label) {
  const path = `${taskId}/${crypto.randomUUID()}-${safeName(file.name)}`
  const { error } = await supabase.storage.from('project-resources').upload(path, file, { contentType: file.type || 'application/octet-stream' })
  if (error) throw new Error(error.message)
  return unwrap(await supabase.from('project_resources').insert({ task_id: taskId, kind, label: label || file.name, path, mime: file.type || null }).select().single())
}
export const addLinkResource = async (taskId, label, url, kind = 'link') => unwrap(await supabase.from('project_resources').insert({ task_id: taskId, kind, label, url }).select().single())
export const deleteResource = async (r) => {
  if (r.path) await supabase.storage.from('project-resources').remove([r.path])
  return unwrap(await supabase.from('project_resources').delete().eq('id', r.id))
}

export const listSubmissions = async (assignmentId) =>
  unwrap(await supabase.from('submissions').select('*, review_comments(id, kind, body, created_at, author_id)').eq('assignment_id', assignmentId).order('round', { ascending: false }))
export const listAdjustments = async (assignmentId) =>
  unwrap(await supabase.from('time_adjustments').select('*').eq('assignment_id', assignmentId).order('created_at', { ascending: false }))
export const rejectWork = (assignmentId, note) => rpc('reject_work', { p_assignment: assignmentId, p_note: note }).then(thenKick)
