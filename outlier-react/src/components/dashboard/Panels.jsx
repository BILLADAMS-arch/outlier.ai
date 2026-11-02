import { Link } from 'react-router-dom'
import LIcon from '../LIcon'
import TaskPhoto from '../TaskPhoto'
import { money, fmtDateTime, durationLabel } from '../../utils/format'

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`dx-card ${className}`}>
      <header className="dx-card-head"><h2>{title}</h2>{action}</header>
      {children}
    </section>
  )
}
export const ViewAll = ({ to, children = 'View all' }) => <Link className="dx-link" to={to}>{children} <LIcon name="arrow" size={14} /></Link>

export function Empty({ icon, title, children, action }) {
  return (
    <div className="dx-empty">
      <span><LIcon name={icon} size={22} /></span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

/** Recent working sessions as a table (stacked rows on phones). */
export function ActivityTable({ segments }) {
  if (!segments.length) return <Empty icon="clock" title="No working sessions yet">Time you track on a project will be listed here.</Empty>
  return (
    <div className="dx-table-wrap">
      <table className="dx-table">
        <thead><tr><th>Project</th><th>Started</th><th>Ended</th><th className="r">Duration</th></tr></thead>
        <tbody>
          {segments.map((s) => {
            const running = !s.endedAt
            const secs = running ? null : (+new Date(s.endedAt) - +new Date(s.startedAt)) / 1000
            return (
              <tr key={s.id}>
                <td data-l="Project"><b>{s.assignments?.tasks?.title || 'Project'}</b></td>
                <td data-l="Started">{fmtDateTime(s.startedAt)}</td>
                <td data-l="Ended">{running ? <span className="dx-live">Running now</span> : fmtDateTime(s.endedAt)}</td>
                <td data-l="Duration" className="r"><b>{running ? '—' : durationLabel(secs)}</b></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function NotificationsPanel({ items, onOpen }) {
  if (!items.length) return <Empty icon="bell" title="You're all caught up">Updates about your projects and payments appear here.</Empty>
  return (
    <ul className="dx-notes">
      {items.map((n) => (
        <li key={n.id} className={n.readAt ? '' : 'unread'}>
          <button type="button" onClick={() => onOpen(n)}>
            <span className="dx-dot" aria-hidden="true" />
            <span><b>{n.title}</b>{n.body && <em>{n.body}</em>}<small>{fmtDateTime(n.createdAt)}</small></span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function AvailableList({ tasks, categories }) {
  if (!tasks.length) return <Empty icon="store" title="Nothing new right now">New projects will appear here when they are published.</Empty>
  return (
    <ul className="dx-avail">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link to={`/marketplace/${t.id}`}>
            <span className="dx-avail-photo"><TaskPhoto image={t.image} icon={categories.find((c) => c.id === t.categoryId)?.icon} w={96} h={96} /></span>
            <span className="dx-avail-text"><b>{t.title}</b><small>{money(t.hourlyRate)}/hr · est. {t.estimatedHours} h</small></span>
            <LIcon name="chevRight" size={16} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** First-steps checklist for taskers who haven't started yet. Every step reflects a real record. */
export function Checklist({ steps }) {
  const done = steps.filter((s) => s.done).length
  return (
    <Card title="Get started" action={<span className="dx-chip">{done}/{steps.length} done</span>} className="dx-onboard">
      <p className="dx-sub">A few steps to start earning on Outlier.</p>
      <ol className="dx-steps">
        {steps.map((s) => (
          <li key={s.label} className={s.done ? 'done' : ''}>
            <span className="dx-tick"><LIcon name={s.done ? 'check' : 'circle'} size={20} /></span>
            <div><b>{s.label}</b><small>{s.hint}</small></div>
            {!s.done && <Link className="dx-link" to={s.to}>{s.cta} <LIcon name="arrow" size={14} /></Link>}
          </li>
        ))}
      </ol>
    </Card>
  )
}
