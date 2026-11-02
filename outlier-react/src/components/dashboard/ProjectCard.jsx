import { Link } from 'react-router-dom'
import { useStartWorking } from '../../hooks/useStartWorking'
import TaskPhoto from '../TaskPhoto'
import LIcon from '../LIcon'
import { StatusPill } from '../ui'
import { money, fmtDate } from '../../utils/format'
import { configFor, progressPercent } from '../../utils/workspaceTypes'

/** An active project (assigned or in progress) with everything needed to carry on. */
export default function ProjectCard({ assignment: a, categories = [] }) {
  const t = a.tasks
  const { start, busyId } = useStartWorking()
  const cat = categories.find((c) => c.id === t?.categoryId)
  const pct = t ? progressPercent(configFor(t), a.workspace?.progress) : null
  const busy = busyId === a.id
  let action
  if (a.status === 'assigned' && !a.onboardedAt) action = <Link className="dx-cta" to={`/projects/${a.id}/onboarding`}>Start Onboarding <LIcon name="arrow" size={16} /></Link>
  else action = (
    <button type="button" className="dx-cta" disabled={busy} onClick={() => start(a)}>
      <LIcon name="play" size={14} /> {busy ? 'Opening…' : a.status === 'in_progress' ? 'Continue Working' : 'Start Working'}
    </button>
  )
  return (
    <article className="dx-project">
      <div className="dx-project-photo"><TaskPhoto image={t?.image} icon={cat?.icon} w={480} h={260} /><span className="dx-project-status"><StatusPill value={a.status} /></span></div>
      <div className="dx-project-body">
        <h3 title={t?.title}>{t?.title || 'Project'}</h3>
        <ul className="dx-meta">
          <li><LIcon name="dollar" size={15} />{money(a.agreedRate)}/hr</li>
          <li><LIcon name="clock" size={15} />Est. {t?.estimatedHours ?? '—'} h</li>
          <li className="ok"><LIcon name="check" size={15} />{a.source === 'assigned' ? 'Assigned' : 'Approved'}</li>
          {t?.deadline && <li><LIcon name="calendar" size={15} />Due {fmtDate(t.deadline)}</li>}
        </ul>
        <div className="dx-progress" aria-label={pct == null ? 'Progress is not tracked for this project' : `${pct}% complete`}>
          <div className="dx-progress-row"><span>Progress</span><b>{pct == null ? 'Not tracked' : `${pct}%`}</b></div>
          <div className="dx-bar"><span style={{ width: `${pct ?? 0}%` }} /></div>
        </div>
        {action}
      </div>
    </article>
  )
}
