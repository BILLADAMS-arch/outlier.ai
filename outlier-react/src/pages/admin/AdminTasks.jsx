import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import * as tasksApi from '../../services/tasks'
import { BANDS, DIFFICULTIES } from '../../utils/status'
import { checkUnsplashId, fileToDataUrl, unsplashId } from '../../utils/images'
import { configToForm, formToConfig } from '../../utils/workspaceConfig'
import { CATEGORY_TYPE, WORKSPACE_TYPES, configFor } from '../../utils/workspaceTypes'
import ResourcesDialog from './ResourcesDialog'
import { money } from '../../utils/format'
import { formatRefLinks, parseRefLinks } from '../../utils/refLinks'
import { DifficultyBadge, EmptyState, Icon, Loaded } from '../../components/ui'
import FormDialog from '../../components/FormDialog'

const lines = (a) => (a || []).join('\n')
const toList = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean)

export default function AdminTasks() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [cat, setCat] = useState('')
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, task = edit
  const [confirm, setConfirm] = useState(null)
  const query = useAsync(async () => ({ tasks: await tasksApi.listTasks(), categories: await tasksApi.listCategories() }), [])
  const [resourcesFor, setResourcesFor] = useState(null)
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); query.reload() } catch (e) { toast.error(e.message) } }

  const applyDefaults = () => act(async () => {
    const todo = (query.data?.tasks || []).filter((t) => !t.workspaceConfig || !Object.keys(t.workspaceConfig).length)
    for (const t of todo) {
      const { configured: _c, type: _t, ...cfg } = configFor(t)
      await tasksApi.saveTask({ ...t, workspaceType: t.workspaceType || CATEGORY_TYPE[t.categoryId] || 'assistant', workspaceConfig: cfg })
    }
  }, 'Default environments saved.')

  return (
    <Loaded query={query}>
      {({ tasks, categories }) => {
        const rows = tasks.filter((t) => (status === 'all' || t.status === status) && (!cat || t.categoryId === cat) && `${t.title} ${t.skills.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
        return (
          <>
            <div className="toolbar">
              <input type="search" placeholder="Search projects…" aria-label="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
              <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
              <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <button className="btn secondary" onClick={applyDefaults} title="Saves the default working environment into projects that have none">Apply default environments</button>
              <button className="btn" onClick={() => setEditing(null)}><Icon name="fa-plus" /> New project</button>
            </div>
            {!tasks.length && <EmptyState icon="fa-box-open" title="No projects yet" action={<button className="btn" onClick={() => act(async () => { await tasksApi.importStarterLibrary() }, 'Starter library imported.')}>Import the 140-project starter library</button>}>Create your first project, or load the starter library to see how the marketplace looks.</EmptyState>}
            <p className="muted">{rows.length} projects{rows.length > 100 ? ' (showing the first 100)' : ''}</p>
            {rows.length ? (
              <div className="table-wrap"><table>
                <thead><tr>{['Project', 'Category', 'Difficulty', 'Rate', 'Status', 'Actions'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 100).map((t) => (
                  <tr key={t.id}>
                    <td><Link to={`/marketplace/${t.id}`}>{t.title}</Link></td><td>{categories.find((c) => c.id === t.categoryId)?.name || '—'}</td>
                    <td><DifficultyBadge level={t.difficulty} /></td><td>{money(t.hourlyRate)}/hr</td><td><span className={`pill st-${t.status}`}>{t.status}</span></td>
                    <td className="acts">
                      <button className="link-btn" onClick={() => setEditing(t)}>Edit</button>
                      <button className="link-btn" onClick={() => setResourcesFor(t)}>Resources</button>
                      <button className="link-btn" onClick={() => act(() => tasksApi.saveTask({ ...t, status: t.status === 'published' ? 'draft' : 'published' }), t.status === 'published' ? 'Project unpublished.' : 'Project published.')}>{t.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                      {t.status !== 'archived' && <button className="link-btn" onClick={() => act(() => tasksApi.saveTask({ ...t, status: 'archived' }), 'Project archived.')}>Archive</button>}
                      <button className="link-btn danger-text" onClick={() => setConfirm(t)}>Delete</button>
                    </td>
                  </tr>))}</tbody>
              </table></div>
            ) : <EmptyState icon="fa-folder-open" title="No projects found">Adjust the filters or create a new project.</EmptyState>}

            {confirm && (
              <FormDialog title="Delete project?" intro={`“${confirm.title}” and all applications and assignments for it will be permanently deleted.`} danger confirmLabel="Delete" onClose={() => setConfirm(null)}
                onSubmit={async () => { await tasksApi.deleteTask(confirm.id); toast.success('Project deleted.'); query.reload() }} />
            )}
            {resourcesFor && <ResourcesDialog task={resourcesFor} onClose={() => setResourcesFor(null)} />}
            {editing !== undefined && <TaskForm task={editing} categories={categories} onClose={() => setEditing(undefined)} onSaved={() => { toast.success(editing ? 'Project updated.' : 'Project created.'); query.reload() }} />}
          </>
        )
      }}
    </Loaded>
  )
}

function TaskForm({ task: t, categories, onClose, onSaved }) {
  const isNew = !t
  const imgOptions = [...(isNew ? [] : [{ value: 'keep', label: 'Keep current image' }]), ...[1, 2, 3].map((n) => ({ value: String(n), label: `Category photo ${n}` }))]
  return (
    <FormDialog wide title={isNew ? 'New project' : 'Edit project'} confirmLabel={isNew ? 'Create project' : 'Save changes'} onClose={onClose}
      initial={t ? { ...t, category: t.categoryId, rate: t.hourlyRate, hours: t.estimatedHours, skills: t.skills.join(', '), responsibilities: lines(t.responsibilities), deliverables: lines(t.deliverables), qualifications: lines(t.qualifications), objectives: lines(t.objectives), guidelines: lines(t.guidelines), apply: t.applyInstructions, instructions: t.instructions || '', deadline: t.deadline || '', refLinks: formatRefLinks(t.referenceLinks), imagePick: 'keep', ...configToForm(t) }
        : { category: categories[0]?.id, difficulty: 'Easy', rateType: 'fixed', status: 'draft', workspaceType: '', tools: '', subtasks: '', deliverables: '', columns: '', targetRows: '', minWords: '', allowAudio: false, requirements: '', experience: '1–2 years of practical experience', refLinks: '', apply: 'Submit a short note describing relevant experience and your availability.', imagePick: '1' }}
      fields={[
        { name: 'title', label: 'Title', required: true, maxLength: 120 },
        { name: 'category', label: 'Category', type: 'select', options: categories.map((c) => ({ value: c.id, label: c.name })) },
        { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTIES },
        { name: 'rate', label: 'Hourly rate (USD, 10–200)', type: 'number', min: 10, max: 200, step: 1, required: true },
        { name: 'hours', label: 'Estimated hours', type: 'number', min: 1, max: 500, step: 1, required: true },
        { name: 'rateType', label: 'Rate type', type: 'select', options: ['fixed', 'negotiable'] },
        { name: 'summary', label: 'Short summary (card text)', type: 'textarea', required: true, maxLength: 200 },
        { name: 'description', label: 'Full description / project overview', type: 'textarea', required: true, maxLength: 1500 },
        { name: 'objectives', label: 'Objectives (one per line, shown in onboarding)', type: 'textarea', maxLength: 1000 },
        { name: 'instructions', label: 'Detailed instructions (one step per line, shown in onboarding)', type: 'textarea', maxLength: 3000, rows: 5 },
        { name: 'guidelines', label: 'Project guidelines (one per line, shown in onboarding)', type: 'textarea', maxLength: 1000 },
        { name: 'skills', label: 'Required skills (comma separated)', required: true },
        { name: 'experience', label: 'Experience level', required: true },
        { name: 'responsibilities', label: 'Responsibilities (one per line)', type: 'textarea', required: true, maxLength: 1500 },
        { name: 'deliverables', label: 'Deliverables (one per line)', type: 'textarea', required: true, maxLength: 1000 },
        { name: 'qualifications', label: 'Qualifications (one per line)', type: 'textarea', required: true, maxLength: 1000 },
        { name: 'apply', label: 'Application instructions', type: 'textarea', required: true, maxLength: 500 },
        { name: 'deadline', label: 'Deadline (leave empty for ongoing)', type: 'date', hint: 'Published projects are re-opened automatically with a new deadline when this date arrives.' },
        { name: 'refLinks', label: 'References and tools (one per line: Title | https://link | reference or tool)', type: 'textarea', maxLength: 2000, hint: 'Leave empty on a new project to use the defaults for its category.' },
        { name: 'status', label: 'Status', type: 'select', options: ['published', 'draft', 'archived'] },
        { name: 'workspaceType', label: 'Working environment', type: 'select', options: [{ value: '', label: '(default for the category)' }, ...Object.entries(WORKSPACE_TYPES).map(([k, v]) => ({ value: k, label: v.label }))], hint: 'Which tools the tasker works with. Writing, data entry, research, transcription, programming, design, analysis or assistance.' },
        { name: 'tools', label: 'Enabled tools (comma separated keys)', hint: 'Keys: writing editor/attachments · data_entry table/csv/attachments · research notes/sources/findings/table/report/attachments · transcription audio/transcript/attachments · code editor/snippets/attachments · design assets/references · analysis upload/table/calc/chart/report · assistant checklist/notes/status/documents' },
        { name: 'subtasks', label: 'Subtasks (one per line: Title | required or optional)', type: 'textarea', maxLength: 1500 },
        { name: 'deliverables', label: 'Required deliverables (one per line: Label | file or section)', type: 'textarea', maxLength: 1500, hint: '"file" means an uploaded file is required; "section" means the written/entered work for this environment must be filled in.' },
        { name: 'columns', label: 'Data-entry columns (Label | text/number/date/email/select:a/b | required/optional)', type: 'textarea', maxLength: 1500 },
        { name: 'targetRows', label: 'Required number of valid rows (data entry)', type: 'number', min: 0, step: 1 },
        { name: 'minWords', label: 'Minimum words (writing)', type: 'number', min: 0, step: 1 },
        { name: 'allowAudio', label: 'Let the tasker upload audio files (transcription)', type: 'checkbox' },
        { name: 'requirements', label: 'Submission requirements (one per line)', type: 'textarea', maxLength: 1000 },
        { name: 'imagePick', label: 'Image', type: 'select', options: imgOptions },
        { name: 'imageUrl', label: '…or an Unsplash image URL', placeholder: 'https://images.unsplash.com/photo-…', hint: 'Must be an images.unsplash.com photo URL; it is checked before saving.' },
        { name: 'file', label: '…or upload an image', type: 'file', accept: 'image/jpeg,image/png,image/webp' },
      ]}
      validate={(d) => {
        const e = {}, r = Number(d.rate), h = Number(d.hours)
        if (!Number.isInteger(r) || r < 10 || r > 200) e.rate = 'Enter a whole number from 10 to 200.'
        else { const [lo, hi] = BANDS[d.difficulty]; if (r < lo || r > hi) e.rate = `${d.difficulty} projects pay $${lo}–$${hi}/hr.` }
        if (!Number.isInteger(h) || h < 1 || h > 500) e.hours = 'Enter a whole number from 1 to 500.'
        if (d.title.length < 5) e.title = 'Title needs at least 5 characters.'
        if (!d.skills.split(',').some((s) => s.trim())) e.skills = 'Add at least one skill.'
        if (d.imageUrl && !unsplashId(d.imageUrl)) e.imageUrl = 'Use an https://images.unsplash.com/photo-… URL.'
        try { parseRefLinks(d.refLinks) } catch (x) { e.refLinks = x.message }
        try { formToConfig(d.workspaceType || CATEGORY_TYPE[d.category] || 'assistant', d) } catch (x) { e.tools = x.message }
        return e
      }}
      onSubmit={async (d) => {
        const cat = categories.find((c) => c.id === d.category)
        let image = t?.image || null
        if (d.file) image = await fileToDataUrl(d.file)
        else if (d.imageUrl) {
          const id = unsplashId(d.imageUrl)
          if (!(await checkUnsplashId(id))) throw new Error('That Unsplash image could not be loaded. Check the URL.')
          image = id
        } else if (d.imagePick !== 'keep') image = cat.images[(Number(d.imagePick) - 1) % cat.images.length]
        else if (!image) image = cat.images[0]
        await tasksApi.saveTask({
          ...(t || { id: `t${Math.random().toString(36).slice(2, 10)}`, postedAt: new Date().toISOString().slice(0, 10) }),
          title: d.title, category: d.category, difficulty: d.difficulty, hourlyRate: Number(d.rate), estimatedHours: Number(d.hours), rateType: d.rateType,
          summary: d.summary, description: d.description, objectives: toList(d.objectives), instructions: d.instructions, guidelines: toList(d.guidelines),
          skills: d.skills.split(',').map((s) => s.trim()).filter((s, i, a) => s && a.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i),
          experience: d.experience, responsibilities: toList(d.responsibilities), deliverables: toList(d.deliverables), qualifications: toList(d.qualifications),
          applyInstructions: d.apply, referenceLinks: parseRefLinks(d.refLinks), deadline: d.deadline || null, status: d.status, image,
          workspaceType: d.workspaceType || null, workspaceConfig: formToConfig(d.workspaceType || CATEGORY_TYPE[d.category] || 'assistant', d),
        })
        onSaved()
      }} />
  )
}
