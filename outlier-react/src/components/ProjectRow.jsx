import { Link } from 'react-router-dom'
import { useStartWorking } from '../hooks/useStartWorking'
import TaskPhoto from './TaskPhoto'
import { StatusPill } from './ui'
import { money, hoursLabel, fmtDate } from '../utils/format'
import { configFor, progressPercent } from '../utils/workspaceTypes'

/** One of the tasker's own projects (an assignment) with the right next action. */
export default function ProjectRow({ assignment: a, categories = [] }) {
  const t = a.tasks
  const { start, busyId } = useStartWorking()
  const cat = categories.find((c) => c.id === t?.categoryId)
  const pct = t ? progressPercent(configFor(t), a.workspace?.progress) : null
  let action = null
  if (a.status === 'assigned') {
    action = a.onboardedAt
      ? <button className="btn" disabled={busyId === a.id} onClick={() => start(a)}>{busyId === a.id ? 'Starting…' : 'Start Working'}</button>
      : <Link className="btn" to={`/projects/${a.id}/onboarding`}>Start Onboarding</Link>
  } else if (a.status === 'in_progress') action = <button className="btn" disabled={busyId === a.id} onClick={() => start(a)}>{busyId === a.id ? 'Opening…' : 'Continue Working'}</button>
  else if (['submitted', 'completed', 'rejected'].includes(a.status)) action = <Link className="btn secondary" to={`/workspace/project/${a.id}`}>View</Link>
  return (
    <div className="row-card app-row">
      <div className="thumb"><TaskPhoto image={t?.image} icon={cat?.icon} w={160} h={100} /></div>
      <div className="grow">
        <h3>{t?.title || 'Project'}</h3>
        <p>{money(a.agreedRate)}/hr · est. {t?.estimatedHours ?? '—'} h · {a.source === 'assigned' ? 'Assigned by an admin' : 'Approved application'} · {fmtDate(a.createdAt)}</p>
        {a.status === 'completed' && <p className="note">Approved {hoursLabel(a.approvedSeconds)} = {money((a.approvedSeconds * a.agreedRate) / 3600)}</p>}
        {pct != null && ['in_progress', 'submitted', 'assigned'].includes(a.status) && <div className="mini-progress" title={`${pct}% complete`}><div className="progress"><span style={{ width: `${pct}%` }} /></div><small>{pct}% complete</small></div>}
        {a.reviewerNote && a.status !== 'completed' && <p className="note">Admin note: {a.reviewerNote}</p>}
      </div>
      <StatusPill value={a.status} />
      {action}
    </div>
  )
}
