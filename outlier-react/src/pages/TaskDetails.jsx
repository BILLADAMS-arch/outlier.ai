import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import * as tasksApi from '../services/tasks'
import * as assignmentsApi from '../services/assignments'
import * as applicationsApi from '../services/applications'
import { useToast } from '../context/ToastContext'
import { AVAILABILITY, projectStatusFor } from '../utils/status'
import { money, fmtDate } from '../utils/format'
import { DifficultyBadge, EmptyState, Loaded, StatusPill } from '../components/ui'
import FormDialog from '../components/FormDialog'
import PayBox from '../components/PayBox'
import TaskPhoto from '../components/TaskPhoto'

const List = ({ items }) => <ul className="bullets">{items.map((i) => <li key={i}>{i}</li>)}</ul>

export default function TaskDetails() {
  const { taskId } = useParams()
  const toast = useToast()
  const [applying, setApplying] = useState(false)
  const query = useAsync(async () => {
    const [task, categories, assignments, applications] = await Promise.all([tasksApi.getTask(taskId), tasksApi.listCategories(), assignmentsApi.listMine(), applicationsApi.listMine()])
    return { task, categories, assignments, applications }
  }, [taskId], { refreshOnFocus: true })

  return (
    <Loaded query={query}>
      {({ task: t, categories, assignments, applications }) => {
        if (!t) return <EmptyState icon="fa-circle-question" title="Project not found" action={<Link className="btn" to="/marketplace">Browse projects</Link>}>This project doesn&apos;t exist or is no longer listed.</EmptyState>
        const cat = categories.find((c) => c.id === t.categoryId)
        const status = projectStatusFor(t.id, assignments, applications)
        const assignment = assignments.find((a) => a.taskId === t.id)
        const myApp = applications.find((a) => a.taskId === t.id && a.status !== 'withdrawn')
        const open = tasksApi.isOpenListing(t)
        const neg = t.rateType === 'negotiable'
        return (
          <>
            <nav className="crumbs" aria-label="Breadcrumb"><Link to="/marketplace">Marketplace</Link> / <Link to={`/marketplace?cat=${t.categoryId}`}>{cat?.name}</Link> / {t.title}</nav>
            <div className="detail-hero"><TaskPhoto image={t.image} icon={cat?.icon} alt={t.title} w={960} h={420} /></div>
            <div className="detail-layout">
              <div className="detail-main">
                <div className="card-top"><span className="cat-label">{cat?.name}</span><DifficultyBadge level={t.difficulty} /></div>
                <h1>{t.title}</h1>
                <p className="lead">{t.description}</p>
                <h2>Responsibilities</h2><List items={t.responsibilities} />
                <h2>Deliverables</h2><List items={t.deliverables} />
                <h2>Required qualifications</h2><List items={t.qualifications} />
                <h2>Required skills</h2><div className="chips">{t.skills.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
                <h2>How to apply</h2><p>{t.applyInstructions}</p>
              </div>
              <aside className="detail-side">
                <PayBox task={t} />
                <dl className="facts">
                  <div><dt>Difficulty</dt><dd>{t.difficulty}</dd></div>
                  <div><dt>Experience</dt><dd>{t.experience}</dd></div>
                  <div><dt>Posted</dt><dd>{fmtDate(t.postedAt)}</dd></div>
                  <div><dt>Deadline</dt><dd>{t.deadline ? fmtDate(t.deadline) : 'Ongoing'}</dd></div>
                </dl>
                <div className="apply-panel">
                  <h3>Your status: <StatusPill value={status} /></h3>
                  {assignment && <Link className="btn big" to={assignment.onboardedAt ? `/projects/${assignment.id}/work` : `/projects/${assignment.id}/onboarding`}>{assignment.onboardedAt ? 'Open workspace' : 'Start Onboarding'}</Link>}
                  {!assignment && myApp && <><p className="muted">Applied {fmtDate(myApp.createdAt)}. An administrator will review it; you can start once it is approved.</p>
                    {myApp.proposedRate && <p>Proposed rate: {money(myApp.proposedRate)}/hr</p>}
                    {myApp.reviewerNote && <p className="note">Reviewer: {myApp.reviewerNote}</p>}
                    {(myApp.status === 'submitted' || myApp.status === 'reviewing') && <button className="btn secondary" onClick={async () => { try { await applicationsApi.withdraw(myApp.id); toast.success('Application withdrawn.'); query.reload() } catch (e) { toast.error(e.message) } }}>Withdraw application</button>}</>}
                  {!assignment && !myApp && open && <><p className="muted">{t.applyInstructions}</p><button className="btn big" onClick={() => setApplying(true)}>Apply for this project</button></>}
                  {!assignment && !myApp && !open && <p className="muted">Applications are closed for this project.</p>}
                </div>
              </aside>
            </div>
            {applying && (
              <FormDialog title={`Apply: ${t.title}`} intro={`${money(t.hourlyRate)}/hr · ${t.estimatedHours} h · est. ${money(t.hourlyRate * t.estimatedHours)}`} confirmLabel="Submit application" onClose={() => setApplying(false)}
                fields={[
                  { name: 'note', label: 'Why are you a good fit?', type: 'textarea', required: true, maxLength: 1000, hint: '30–1000 characters. Mention relevant experience.' },
                  { name: 'availability', label: 'Availability', type: 'select', options: AVAILABILITY },
                  ...(neg ? [{ name: 'rate', label: 'Proposed hourly rate (USD, optional)', type: 'number', min: 10, max: 200, step: 1, hint: `Listed rate is ${money(t.hourlyRate)}/hr. Leave blank to accept it.` }] : []),
                  { name: 'ok', label: 'I confirm my details are accurate.', type: 'checkbox', required: true, requiredMessage: 'Please confirm before submitting.' },
                ]}
                validate={(d) => ({
                  note: d.note.length < 30 ? `Please write at least 30 characters (${d.note.length} so far).` : '',
                  rate: neg && d.rate !== '' && !(Number.isInteger(Number(d.rate)) && Number(d.rate) >= 10 && Number(d.rate) <= 200) ? 'Enter a whole number from 10 to 200.' : '',
                })}
                onSubmit={async (d) => {
                  await applicationsApi.apply({ taskId: t.id, note: d.note, availability: d.availability, proposedRate: neg && d.rate !== '' ? Number(d.rate) : null })
                  toast.success('Application submitted. An administrator will review it.')
                  query.reload()
                }} />
            )}
          </>
        )
      }}
    </Loaded>
  )
}
