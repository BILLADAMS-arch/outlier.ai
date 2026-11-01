import { Link } from 'react-router-dom'
import TaskPhoto from './TaskPhoto'
import { StatusPill } from './ui'
import { money, hoursLabel, fmtDate } from '../utils/format'

/** One of the tasker's own projects (an assignment) with the right next action. */
export default function ProjectRow({ assignment: a, categories = [] }) {
  const t = a.tasks
  const cat = categories.find((c) => c.id === t?.categoryId)
  let action = null
  if (a.status === 'assigned') {
    action = a.onboardedAt
      ? <Link className="btn" to={`/projects/${a.id}/work`}>Start Working</Link>
      : <Link className="btn" to={`/projects/${a.id}/onboarding`}>Start Onboarding</Link>
  } else if (a.status === 'in_progress') action = <Link className="btn" to={`/projects/${a.id}/work`}>Continue Working</Link>
  else if (a.status === 'submitted' || a.status === 'completed') action = <Link className="btn secondary" to={`/projects/${a.id}/work`}>View</Link>
  return (
    <div className="row-card app-row">
      <div className="thumb"><TaskPhoto image={t?.image} icon={cat?.icon} w={160} h={100} /></div>
      <div className="grow">
        <h3>{t?.title || 'Project'}</h3>
        <p>{money(a.agreedRate)}/hr · est. {t?.estimatedHours ?? '—'} h · {a.source === 'assigned' ? 'Assigned by an admin' : 'Approved application'} · {fmtDate(a.createdAt)}</p>
        {a.status === 'completed' && <p className="note">Approved {hoursLabel(a.approvedSeconds)} = {money((a.approvedSeconds * a.agreedRate) / 3600)}</p>}
        {a.reviewerNote && a.status !== 'completed' && <p className="note">Admin note: {a.reviewerNote}</p>}
      </div>
      <StatusPill value={a.status} />
      {action}
    </div>
  )
}
