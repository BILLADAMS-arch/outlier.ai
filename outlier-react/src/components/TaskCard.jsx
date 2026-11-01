import { Link } from 'react-router-dom'
import TaskPhoto from './TaskPhoto'
import { DifficultyBadge, StatusPill } from './ui'
import { money } from '../utils/format'

export default function TaskCard({ task, category, status }) {
  const href = `/marketplace/${encodeURIComponent(task.id)}`
  return (
    <article className="task-card">
      <Link to={href} className="card-img" tabIndex={-1} aria-hidden="true">
        <TaskPhoto image={task.image} icon={category?.icon} alt={`${category?.name || 'Project'} – ${task.title}`} />
      </Link>
      <div className="card-body">
        <div className="card-top">
          <span className="cat-label">{category?.name || 'Uncategorised'}</span>
          <DifficultyBadge level={task.difficulty} />
        </div>
        <h3><Link to={href}>{task.title}</Link></h3>
        <div className="card-pay">
          <strong>{money(task.hourlyRate)}/hr</strong>
          <span>≈ {task.estimatedHours} h · {money(task.hourlyRate * task.estimatedHours)}</span>
          <span className={`pill ${task.rateType === 'negotiable' ? 'neg' : 'fix'}`}>{task.rateType === 'negotiable' ? 'Negotiable' : 'Fixed rate'}</span>
        </div>
        <p className="clamp">{task.summary}</p>
        <div className="chips">
          {task.skills.slice(0, 3).map((s) => <span className="chip" key={s}>{s}</span>)}
          {task.skills.length > 3 && <span className="chip more">+{task.skills.length - 3}</span>}
        </div>
        <div className="inline-actions">{status && status !== 'available' && <StatusPill value={status} />}</div>
        <Link to={href} className="btn card-cta">View Details</Link>
      </div>
    </article>
  )
}
