import { WORKSPACE_TYPES, configFor, typeFor } from './workspaceTypes'

export const SECTION_KEY = { writing: 'doc', data_entry: 'table', research: 'research', transcription: 'transcript', code: 'code', analysis: 'analysis', assistant: 'assistant' }
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item'
const lines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean)

/** Admin form text -> stored configuration. Throws Error(message) for invalid input. */
export function formToConfig(type, v) {
  const allowed = Object.keys(WORKSPACE_TYPES[type].tools)
  const tools = v.tools.split(',').map((t) => t.trim()).filter(Boolean)
  const bad = tools.find((t) => !allowed.includes(t))
  if (bad) throw new Error(`Unknown tool "${bad}" for this environment. Allowed: ${allowed.join(', ')}`)
  const subtasks = lines(v.subtasks).map((l) => { const [title, flag] = l.split('|').map((x) => x.trim()); return { id: slug(title), title, required: (flag || 'required').toLowerCase() !== 'optional' } })
  if (new Set(subtasks.map((s) => s.id)).size !== subtasks.length) throw new Error('Subtask titles must be different from each other.')
  const requiredDeliverables = lines(v.deliverables).map((l) => {
    const [label, kind] = l.split('|').map((x) => x.trim())
    const k = (kind || 'file').toLowerCase()
    if (!['file', 'section'].includes(k)) throw new Error(`Deliverable "${label}": use "file" or "section" after the | sign.`)
    if (k === 'section' && !SECTION_KEY[type]) throw new Error(`"${WORKSPACE_TYPES[type].label}" has no written section; use "file".`)
    return k === 'file' ? { id: slug(label), label, kind: 'file' } : { id: slug(label), label, kind: 'section', key: SECTION_KEY[type] }
  })
  const columns = lines(v.columns).map((l) => {
    const [label, typ = 'text', req = 'required'] = l.split('|').map((x) => x.trim())
    const [t, opts] = typ.split(':')
    if (!['text', 'number', 'date', 'email', 'select'].includes(t)) throw new Error(`Column "${label}": type must be text, number, date, email or select:a/b/c`)
    return { key: slug(label), label, type: t, required: req.toLowerCase() !== 'optional', ...(t === 'select' ? { options: (opts || '').split('/').map((x) => x.trim()).filter(Boolean) } : {}) }
  })
  return {
    tools, subtasks, requiredDeliverables, ...(columns.length ? { columns } : {}), targetRows: Number(v.targetRows) || 0, minWords: Number(v.minWords) || 0,
    allowAudioUpload: !!v.allowAudio, submissionRequirements: lines(v.requirements),
  }
}

/** Stored configuration -> admin form text. */
export function configToForm(task) {
  const cfg = configFor(task)
  return {
    workspaceType: task.workspaceType || '',
    tools: cfg.tools.join(', '),
    subtasks: cfg.subtasks.map((s) => `${s.title} | ${s.required ? 'required' : 'optional'}`).join('\n'),
    deliverables: cfg.requiredDeliverables.map((d) => `${d.label} | ${d.kind || 'file'}`).join('\n'),
    columns: cfg.type === 'data_entry' ? cfg.columns.map((c) => `${c.label} | ${c.type === 'select' ? `select:${(c.options || []).join('/')}` : c.type} | ${c.required ? 'required' : 'optional'}`).join('\n') : '',
    targetRows: cfg.targetRows || '', minWords: cfg.minWords || '', allowAudio: cfg.allowAudioUpload, requirements: cfg.submissionRequirements.join('\n'),
  }
}
export { typeFor }
