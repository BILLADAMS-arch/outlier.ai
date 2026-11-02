import { configFor } from './workspaceTypes'
import { DEFAULT_GUIDELINES } from './onboarding'

const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])
const steps = (task) => (task.instructions ? task.instructions.split('\n').map((s) => s.trim()).filter(Boolean) : list(task.responsibilities))

/** True when the project has a structured brief (background, scope, acceptance criteria...), not just the legacy fields. */
export const hasDetailedBrief = (task) => {
  const b = task.brief || {}
  return !!(b.background && b.problem && list(b.acceptance).length && task.instructions)
}

/**
 * The ordered sections of a project brief, built from the project record. Empty sections are left out, so older projects
 * still render from their legacy fields. Each section: { id, title, icon, kind, ... } for components/brief/BriefView.
 */
export function briefSections(task) {
  const b = task.brief || {}
  const cfg = configFor({ ...task, categoryId: task.categoryId })
  const out = []
  const add = (s) => { if (s) out.push(s) }
  add({ id: 'overview', title: 'Project description', icon: 'book', kind: 'text', text: task.description })
  if (b.background) add({ id: 'background', title: 'Background and context', icon: 'folder', kind: 'text', text: b.background })
  if (b.problem) add({ id: 'problem', title: 'Problem statement and objective', icon: 'sparkles', kind: 'text', text: b.problem, bullets: list(task.objectives) })
  else if (list(task.objectives).length) add({ id: 'problem', title: 'Objectives', icon: 'sparkles', kind: 'list', items: list(task.objectives) })
  if (list(b.scopeIn).length || list(b.scopeOut).length) add({ id: 'scope', title: 'Scope of work', icon: 'list', kind: 'scope', inScope: list(b.scopeIn), outScope: list(b.scopeOut) })
  add({ id: 'steps', title: 'Step-by-step instructions', icon: 'play', kind: 'steps', items: steps(task) })
  if (list(b.inputs).length || b.caseData) add({ id: 'inputs', title: 'Input materials and supporting files', icon: 'inbox', kind: 'inputs', inputs: list(b.inputs), caseData: b.caseData })
  if (list(task.referenceLinks).length) add({ id: 'tools', title: 'Recommended tools and resources', icon: 'briefcase', kind: 'links', links: task.referenceLinks })
  add({ id: 'deliverables', title: 'Expected deliverables and formats', icon: 'check', kind: 'list', items: list(task.deliverables) })
  if (list(b.acceptance).length) add({ id: 'acceptance', title: 'Acceptance criteria and quality standards', icon: 'shield', kind: 'list', items: list(b.acceptance) })
  add({ id: 'milestones', title: 'Deadline, milestones and effort', icon: 'calendar', kind: 'milestones', deadline: task.deadline, hours: task.estimatedHours, items: list(b.milestones) })
  const submission = [...new Set([...list(b.submission), ...cfg.submissionRequirements])]
  if (submission.length) add({ id: 'submission', title: 'Submission requirements', icon: 'mail', kind: 'list', items: submission })
  add({ id: 'skills', title: 'Required skills and experience', icon: 'user', kind: 'skills', skills: list(task.skills), items: list(task.qualifications), experience: task.experience })
  add({ id: 'guidelines', title: 'Project guidelines', icon: 'shield', kind: 'list', items: list(task.guidelines).length ? task.guidelines : DEFAULT_GUIDELINES })
  return out.filter((s) => (s.kind === 'text' ? s.text : s.kind === 'milestones' || s.kind === 'skills' || s.kind === 'scope' || s.kind === 'inputs' || s.kind === 'links' ? true : s.items?.length))
}

const KINDS = ['public', 'illustrative', 'tasker']
/** Admin text <-> inputs: "Title | public, illustrative or tasker | https://link (optional) | note (optional)". */
export const formatInputs = (inputs = []) => inputs.map((i) => [i.title, i.kind, i.url || '', i.note || ''].join(' | ').replace(/( \| )+$/, '')).join('\n')
export function parseInputs(text = '') {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line, n) => {
    const [title = '', kind = '', url = '', ...rest] = line.split('|').map((x) => x.trim())
    if (!title) throw new Error(`Input line ${n + 1} needs a title.`)
    if (!KINDS.includes(kind)) throw new Error(`Input line ${n + 1}: type must be public, illustrative or tasker.`)
    if (url && !/^https:\/\/\S+$/.test(url)) throw new Error(`Input line ${n + 1}: the link must start with https://`)
    if (kind === 'public' && !url) throw new Error(`Input line ${n + 1}: a public source needs a link.`)
    return { title, kind, ...(url ? { url } : {}), ...(rest.join(' | ') ? { note: rest.join(' | ') } : {}) }
  })
}

/** What an administrator still has to add before a project can be published. */
export function missingBrief(task) {
  const b = task.brief || {}
  const miss = []
  if (!b.background) miss.push('background')
  if (!b.problem) miss.push('problem statement')
  if (!(b.scopeIn || []).length) miss.push('scope')
  if (!task.instructions) miss.push('step-by-step instructions')
  if (!(b.inputs || []).length && !b.caseData) miss.push('input materials')
  if (!(b.acceptance || []).length) miss.push('acceptance criteria')
  return miss
}
