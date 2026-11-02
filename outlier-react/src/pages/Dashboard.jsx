import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import * as assignmentsApi from '../services/assignments'
import * as applicationsApi from '../services/applications'
import * as paymentsApi from '../services/payments'
import * as tasksApi from '../services/tasks'
import * as earningsApi from '../services/earnings'
import * as notificationsApi from '../services/notifications'
import * as payoutApi from '../services/payout'
import { activityWeeks, completedTrend, computeStats, earningsTrend } from '../utils/stats'
import { money, fmtDateTime } from '../utils/format'
import { addDays, shortDay, todayIso, mondayOf } from '../utils/dates'
import { Loaded, PageHeader, StatusPill } from '../components/ui'
import ProjectRow from '../components/ProjectRow'
import CountUp from '../components/CountUp'
import { BarChart } from '../components/charts'
import LIcon from '../components/LIcon'
import StatCard from '../components/dashboard/StatCard'
import ProjectCard from '../components/dashboard/ProjectCard'
import { ActivityTable, AvailableList, Card, Checklist, Empty, NotificationsPanel, ViewAll } from '../components/dashboard/Panels'

/** Optional extras must never take the dashboard down with them. */
const soft = (p) => p.catch(() => null)
const sumBy = (rows, key) => { const m = new Map(); for (const r of rows || []) m.set(r.bucket, (m.get(r.bucket) || 0) + Number(r[key] || 0)); return m }

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
  const { profile, user, isApproved, isAdmin, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const query = useAsync(async () => {
    if (!isApproved && !isAdmin) { await refreshProfile(); return null }
    const today = todayIso(), dayFrom = addDays(today, -6), weekFrom = addDays(mondayOf(today), -7 * 7)
    const [assignments, applications, payments, segments, categories, tasks, notes, payout, daily, weekly] = await Promise.all([
      assignmentsApi.listMine(), applicationsApi.listMine(), paymentsApi.listMine(), assignmentsApi.recentSegments(8), tasksApi.listCategories(),
      soft(tasksApi.listTasks()), soft(notificationsApi.listNotifications(5)), soft(payoutApi.getMine(user.id)),
      soft(earningsApi.rows(dayFrom, today, 'day', user.id)), soft(earningsApi.rows(weekFrom, today, 'week', user.id)),
    ])
    return { assignments, applications, payments, segments, categories, tasks, notes, payout, daily, weekly }
  }, [isApproved, isAdmin, user?.id], { refreshOnFocus: true })

  async function openNote(n) {
    if (!n.readAt) await notificationsApi.markRead([n.id]).catch(() => {})
    if (n.link) navigate(n.link)
    else query.reload?.()
  }

  if (!isApproved && !isAdmin) return <Pending profile={profile} />
  const fullName = (profile.displayName || '').trim()

  return (
    <div className="dx">
      <header className="dx-hello">
        <h1>Welcome back{fullName ? `, ${fullName}` : ''}</h1>
        <p>Here is where your projects, time and earnings stand today.</p>
      </header>
      <Loaded query={query}>
        {(d) => {
          const stats = computeStats(d.assignments, d.payments)
          const eTrend = earningsTrend(d.payments), cTrend = completedTrend(d.assignments), weeks = activityWeeks(d.assignments)
          const by = (...st) => d.assignments.filter((a) => st.includes(a.status))
          const active = by('in_progress', 'assigned')
          const submitted = by('submitted'), completed = by('completed')
          const pendingApps = d.applications.filter((a) => a.status === 'submitted' || a.status === 'reviewing')
          const taken = new Set([...d.assignments.map((a) => a.taskId), ...d.applications.map((a) => a.taskId)])
          const available = (d.tasks || []).filter((t) => tasksApi.isOpenListing(t) && !taken.has(t.id)).slice(0, 4)
          const dayMap = sumBy(d.daily, 'seconds'), weekMap = sumBy(d.weekly, 'trackedAmount')
          const dayData = Array.from({ length: 7 }, (_, i) => { const day = addDays(addDays(todayIso(), -6), i); return { label: shortDay(day), hours: Math.round(((dayMap.get(day) || 0) / 3600) * 10) / 10 } })
          const weekData = Array.from({ length: 8 }, (_, i) => { const w = addDays(mondayOf(todayIso()), -7 * (7 - i)); return { label: shortDay(w), earned: Math.round((weekMap.get(w) || 0) * 100) / 100 } })
          const steps = [
            { label: 'Account approved', hint: 'You can browse and apply to projects.', done: true },
            { label: 'Add your payment details', hint: 'Needed so approved earnings can be paid out.', done: !!d.payout, to: '/payout', cta: 'Add details' },
            { label: 'Find your first project', hint: 'Apply to a project or wait for an assignment.', done: d.assignments.length + d.applications.length > 0, to: '/marketplace', cta: 'Browse projects' },
            { label: 'Track your first session', hint: 'Open a project and start working.', done: d.segments.length > 0, to: '/projects', cta: 'My projects' },
          ]
          const newcomer = steps.some((x) => !x.done) && !completed.length
          const totalSecs = dayData.reduce((t, x) => t + x.hours, 0)
          return (
            <>
              <section className="dx-stats" aria-label="Summary">
                <StatCard icon="dollar" tone="blue" label="Total earnings" trend={eTrend.change == null ? null : { change: eTrend.change, label: 'vs last month' }} hint={eTrend.thisMonth ? `${money(eTrend.thisMonth)} this month` : 'Approved and pending payments'}>
                  <CountUp value={stats.totalEarnings} format={money} />
                </StatCard>
                <StatCard icon="list" tone="violet" label="Tasks completed" trend={cTrend.change == null ? null : { change: cTrend.change, label: 'vs last week' }} hint={cTrend.thisWeek ? `${cTrend.thisWeek} this week` : 'Approved projects'}>
                  <CountUp value={stats.tasksCompleted} format={(n) => String(Math.round(n))} />
                </StatCard>
                <StatCard icon="calendar" tone="teal" label="Avg. tasks per week" hint={weeks ? `Across ${weeks} week${weeks === 1 ? '' : 's'} of activity` : 'Starts once you take a project'}>
                  <CountUp value={stats.avgPerWeek} format={(n) => String(Math.round(n * 10) / 10)} />
                </StatCard>
              </section>

              {newcomer && <Checklist steps={steps} />}

              <section className="dx-section">
                <div className="dx-section-head"><h2>In-progress projects</h2><ViewAll to="/projects">All projects</ViewAll></div>
                {active.length ? (
                  <div className="dx-grid">{active.map((a) => <ProjectCard key={a.id} assignment={a} categories={d.categories} />)}</div>
                ) : (
                  <Empty icon="briefcase" title="No active projects" action={<Link className="dx-cta" to="/marketplace">Browse available projects</Link>}>
                    Apply to a project, or wait for an administrator to assign one. It will show up here.
                  </Empty>
                )}
              </section>

              <div className="dx-two">
                <Card title="Earnings overview" action={<ViewAll to="/earnings">Details</ViewAll>}>
                  {d.weekly ? <><p className="dx-sub">Tracked earnings per week, last 8 weeks</p><BarChart data={weekData} series={[{ key: 'earned', label: 'Tracked earnings', color: '#2563eb' }]} fmt={money} height={220} /></> : <Empty icon="wallet" title="Earnings chart unavailable">Open Earnings for the full breakdown.</Empty>}
                </Card>
                <Card title="Weekly productivity" action={<ViewAll to="/earnings">Details</ViewAll>}>
                  {d.daily ? <><p className="dx-sub">{totalSecs ? `${Math.round(totalSecs * 10) / 10} hours tracked in the last 7 days` : 'Hours tracked per day, last 7 days'}</p><BarChart data={dayData} series={[{ key: 'hours', label: 'Hours', color: '#7c3aed' }]} fmt={(n) => `${Math.round(n * 10) / 10}h`} height={220} /></> : <Empty icon="clock" title="Productivity chart unavailable">Open Earnings for tracked time.</Empty>}
                </Card>
              </div>

              <div className="dx-two">
                <Card title="Recent notifications" action={<ViewAll to="/notifications" />}>
                  {d.notes ? <NotificationsPanel items={d.notes} onOpen={openNote} /> : <Empty icon="bell" title="Notifications unavailable">Open the notification bell to try again.</Empty>}
                </Card>
                <Card title="Available projects" action={<ViewAll to="/marketplace">Marketplace</ViewAll>}>
                  {d.tasks ? <AvailableList tasks={available} categories={d.categories} /> : <Empty icon="store" title="Projects unavailable">Open the marketplace to browse.</Empty>}
                </Card>
              </div>

              <Card title="Recent working activity" action={<ViewAll to="/projects">View all</ViewAll>}>
                <ActivityTable segments={d.segments} />
              </Card>

              {pendingApps.length > 0 && (
                <section className="dx-section">
                  <div className="dx-section-head"><h2>Applications awaiting approval</h2></div>
                  {pendingApps.map((a) => (
                    <div className="row-card" key={a.id}>
                      <div className="grow"><h3><Link to={`/marketplace/${a.taskId}`}>{a.tasks?.title || 'Project'}</Link></h3><p>Applied {fmtDateTime(a.createdAt)}</p></div>
                      <StatusPill kind="project" value="applied" />
                    </div>
                  ))}
                </section>
              )}
              {[['Submitted for review', submitted], ['Completed', completed]].map(([title, rows]) => rows.length > 0 && (
                <section className="dx-section" key={title}>
                  <div className="dx-section-head"><h2>{title}</h2></div>
                  {rows.map((a) => <ProjectRow key={a.id} assignment={a} categories={d.categories} />)}
                </section>
              ))}
            </>
          )
        }}
      </Loaded>
    </div>
  )
}
