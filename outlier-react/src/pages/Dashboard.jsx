import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import * as assignmentsApi from '../services/assignments'
import * as applicationsApi from '../services/applications'
import * as paymentsApi from '../services/payments'
import * as tasksApi from '../services/tasks'
import { computeStats } from '../utils/stats'
import { money, fmtDateTime, hms } from '../utils/format'
import { EmptyState, Icon, Loaded, PageHeader, StatusPill } from '../components/ui'
import ProjectRow from '../components/ProjectRow'
import CountUp from '../components/CountUp'

function Stat({ icon, label, value }) {
  return <div className="stat-card"><Icon name={icon} /><span>{label}</span><div className="value">{value}</div></div>
}

function Pending({ profile }) {
  const rejected = profile.accountStatus === 'rejected'
  return (
    <>
      <PageHeader title={`Welcome, ${profile.displayName}!`}>Here are the latest updates for Outlier</PageHeader>
      <div className="panel">
        <h2>Account status: <StatusPill kind="account" value={profile.accountStatus} /></h2>
        {rejected ? (
          <>
            <p>Your registration was not approved{profile.reviewNote ? `: ${profile.reviewNote}` : '.'}</p>
            <p className="muted">If you think this is a mistake, contact the Outlier team.</p>
          </>
        ) : (
          <>
            <p>Thanks for registering. An administrator is reviewing your account. Once it is approved you can browse projects, apply, and start working.</p>
            <p className="muted">You can keep this page open: it checks again whenever you return to the tab.</p>
          </>
        )}
      </div>
    </>
  )
}

export default function Dashboard() {
  const { profile, isApproved, isAdmin, refreshProfile } = useAuth()
  const query = useAsync(async () => {
    if (!isApproved && !isAdmin) { await refreshProfile(); return null }
    const [assignments, applications, payments, segments, categories] = await Promise.all([
      assignmentsApi.listMine(), applicationsApi.listMine(), paymentsApi.listMine(), assignmentsApi.recentSegments(8), tasksApi.listCategories(),
    ])
    return { assignments, applications, payments, segments, categories }
  }, [isApproved, isAdmin], { refreshOnFocus: true })

  if (!isApproved && !isAdmin) return <Pending profile={profile} />

  return (
    <>
      <PageHeader title={`Welcome, ${profile.displayName}!`}>Here are the latest updates for Outlier</PageHeader>
      <Loaded query={query}>
        {(d) => {
          const stats = computeStats(d.assignments, d.payments)
          const by = (s) => d.assignments.filter((a) => a.status === s)
          const pendingApps = d.applications.filter((a) => a.status === 'submitted' || a.status === 'reviewing')
          const groups = [['Assigned to you', by('assigned')], ['In progress', by('in_progress')], ['Submitted for review', by('submitted')], ['Completed', by('completed')]]
          const empty = !d.assignments.length && !pendingApps.length
          return (
            <>
              <section className="stats">
                <Stat icon="fa-dollar-sign" label="Total Earnings" value={<CountUp value={stats.totalEarnings} format={money} />} />
                <Stat icon="fa-list" label="Tasks Completed" value={<CountUp value={stats.tasksCompleted} format={(n) => String(Math.round(n))} />} />
                <Stat icon="fa-list-check" label="Avg. Tasks per Week" value={<CountUp value={stats.avgPerWeek} format={(n) => String(Math.round(n * 10) / 10)} />} />
              </section>
              {empty && (
                <EmptyState icon="fa-store" title="No projects yet" action={<Link className="btn" to="/marketplace">Browse available projects</Link>}>
                  Apply to a project, or wait for an administrator to assign one. It will show up here.
                </EmptyState>
              )}
              {pendingApps.length > 0 && (
                <section>
                  <h2>Applications awaiting approval</h2>
                  {pendingApps.map((a) => (
                    <div className="row-card" key={a.id}>
                      <div className="grow"><h3><Link to={`/marketplace/${a.taskId}`}>{a.tasks?.title || 'Project'}</Link></h3><p>Applied {fmtDateTime(a.createdAt)}</p></div>
                      <StatusPill kind="project" value="applied" />
                    </div>
                  ))}
                </section>
              )}
              {groups.map(([title, rows]) => rows.length > 0 && (
                <section key={title}>
                  <h2>{title}</h2>
                  {rows.map((a) => <ProjectRow key={a.id} assignment={a} categories={d.categories} />)}
                </section>
              ))}
              <section>
                <div className="section-title"><h2>Recent working activity</h2><Link to="/projects">All projects</Link></div>
                {d.segments.length ? (
                  <div className="panel">
                    <ul className="mini-list">
                      {d.segments.map((s) => (
                        <li key={s.id}>
                          <span>{s.assignments?.tasks?.title || 'Project'}</span>
                          <span className="muted">{fmtDateTime(s.startedAt)} → {s.endedAt ? `${fmtDateTime(s.endedAt)} (${hms((+new Date(s.endedAt) - +new Date(s.startedAt)) / 1000)})` : 'running now'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : <EmptyState icon="fa-clock" title="No working sessions yet">Your tracked time will be listed here.</EmptyState>}
              </section>
            </>
          )
        }}
      </Loaded>
    </>
  )
}
