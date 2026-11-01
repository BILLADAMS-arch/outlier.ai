import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import * as earningsApi from '../services/earnings'
import { addDays, addMonths, iso, mondayOf, monthLabel, monthStart, shortDay, todayIso, weekLabel } from '../utils/dates'
import { fmtDate, hoursLabel, money } from '../utils/format'
import { historyPdf, receiptPdf } from '../utils/pdf'
import { BarChart, LineChart } from '../components/charts'
import CountUp from '../components/CountUp'
import { EmptyState, Icon, Loaded, PageHeader, StatusPill } from '../components/ui'

const VIEWS = { week: 'Weekly', month: 'Monthly', year: 'Yearly' }

function range(view) {
  const today = todayIso()
  if (view === 'week') return { from: addDays(mondayOf(today), -7 * 11), to: today, bucket: 'week' }
  if (view === 'month') return { from: addMonths(today, -11), to: today, bucket: 'month' }
  return { from: `${Number(today.slice(0, 4)) - 4}-01-01`, to: today, bucket: 'year' }
}
const labelOf = (view, b) => (view === 'week' ? shortDay(b) : view === 'month' ? monthLabel(b) : b.slice(0, 4))

function Card({ icon, label, value, sub, money: isMoney = true }) {
  return <div className="stat-card"><Icon name={icon} /><span>{label}</span><div className="value">{isMoney ? <CountUp value={Number(value)} format={money} /> : value}</div>{sub && <small className="muted">{sub}</small>}</div>
}

export default function Earnings() {
  const { profile, user } = useAuth()
  const toast = useToast()
  const [view, setView] = useState('week')
  const r = range(view)
  const query = useAsync(async () => {
    const [summary, rows, payments, weekRows, monthRows] = await Promise.all([
      earningsApi.summary(user.id), earningsApi.rows(r.from, r.to, r.bucket, user.id), earningsApi.listPayments(user.id),
      earningsApi.rows(addDays(mondayOf(todayIso()), -7 * 25), todayIso(), 'week', user.id), earningsApi.rows(addMonths(todayIso(), -11), todayIso(), 'month', user.id),
    ])
    return { summary, rows, payments, weekRows, monthRows }
  }, [view, user.id], { refreshOnFocus: true })

  const charts = useMemo(() => {
    if (!query.data) return null
    const byBucket = new Map()
    for (const x of query.data.rows) {
      const b = byBucket.get(x.bucket) || { label: labelOf(view, x.bucket), tracked: 0, hours: 0, pending: 0, approved: 0, paid: 0 }
      b.tracked += x.trackedAmount; b.hours += x.seconds / 3600; b.pending += x.pendingAmount; b.approved += x.approvedAmount; b.paid += x.paidAmount
      byBucket.set(x.bucket, b)
    }
    const series = [...byBucket.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v)
    const byProject = new Map()
    for (const x of query.data.rows) byProject.set(x.taskTitle, (byProject.get(x.taskTitle) || 0) + x.trackedAmount)
    const projects = [...byProject.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, v]) => ({ label: label.slice(0, 16), v }))
    const monthly = new Map()
    for (const p of query.data.payments.filter((x) => x.status === 'paid' && x.paidAt)) { const k = monthStart(iso(new Date(p.paidAt))); monthly.set(k, (monthly.get(k) || 0) + Number(p.amount)) }
    const pay = [...monthly.entries()].sort().map(([k, v]) => ({ label: monthLabel(k), v }))
    return { series, projects, pay }
  }, [query.data, view])

  const stmtList = (rows, bucket) => {
    const seen = new Map()
    for (const x of rows) { const s = seen.get(x.bucket) || { start: x.bucket, tracked: 0, seconds: 0 }; s.tracked += x.trackedAmount; s.seconds += x.seconds; seen.set(x.bucket, s) }
    return [...seen.values()].sort((a, b) => b.start.localeCompare(a.start)).slice(0, bucket === 'week' ? 12 : 12)
  }

  return (
    <>
      <PageHeader title="My Earnings">Tracked, pending, approved and paid amounts are kept separate. Approved is not paid until a payment is completed and recorded. All amounts are in USD.</PageHeader>
      <Loaded query={query}>
        {({ summary: s, payments, weekRows, monthRows }) => {
          const cal = s.calendar
          return (
            <>
              <section className="stats cards6">
                <Card icon="fa-sack-dollar" label="Total lifetime earnings" value={s.lifetime} sub="Work approved by an administrator" />
                <Card icon="fa-calendar" label="Current month earnings" value={s.currentMonth} sub="Tracked value of hours this month" />
                <Card icon="fa-hourglass-half" label="Pending approval" value={s.pending} sub="Submitted work and payments awaiting approval" />
                <Card icon="fa-circle-check" label="Approved for payment" value={s.approved} sub="Not yet paid" />
                <Card icon="fa-calendar-check" label="Next expected payment" value={cal.approvedForCycle} sub={`${fmtDate(cal.paymentDate)} (${cal.daysUntilPayment} days)`} />
                <Card icon="fa-clock" label="Total hours worked" value={`${Number(s.hours).toFixed(2)} h`} money={false} sub={`${money(s.tracked)} tracked · ${money(s.paid)} paid`} />
              </section>

              <section className="panel">
                <h2>Payment calendar</h2>
                <dl className="kv">
                  <dt>Next payment date</dt><dd>{fmtDate(cal.paymentDate)} <small className="muted">(last Tuesday of the month)</small></dd>
                  <dt>Earnings cutoff</dt><dd>{fmtDate(cal.cutoffDate)}</dd>
                  <dt>Payment approval deadline</dt><dd>{fmtDate(cal.approvalDeadline)}</dd>
                  <dt>Cycle status</dt><dd>{cal.status}</dd>
                  <dt>Approved for this cycle</dt><dd>{money(cal.approvedForCycle)}{cal.carriedForward > 0 && <small className="muted"> (includes {money(cal.carriedForward)} carried forward)</small>}</dd>
                  <dt>Awaiting approval for this cycle</dt><dd>{money(cal.pendingForCycle)}</dd>
                </dl>
                <p className="muted small">Work approved after the earnings cutoff, or a payment approved after the approval deadline, moves to the next payment cycle. You need a verified bank or AirTM account in <Link to="/payout">Payment Settings</Link>.</p>
              </section>

              <section className="panel">
                <div className="section-title"><h2>Earnings charts</h2>
                  <div className="tabs wrap">{Object.entries(VIEWS).map(([k, l]) => <button key={k} className={`tab-link${view === k ? ' active' : ''}`} onClick={() => setView(k)}>{l}</button>)}</div></div>
                <div className="chart-grid">
                  <div><h3>{VIEWS[view]} earnings trend</h3><LineChart data={charts.series} series={[{ key: 'tracked', label: 'Tracked earnings' }]} fmt={money} /></div>
                  <div><h3>Hours worked</h3><BarChart data={charts.series} series={[{ key: 'hours', label: 'Hours' }]} fmt={(n) => `${n.toFixed(1)} h`} /></div>
                  <div><h3>Approved vs pending vs paid</h3><BarChart stacked data={charts.series} series={[{ key: 'pending', label: 'Pending', color: '#f59e0b' }, { key: 'approved', label: 'Approved', color: '#2563eb' }, { key: 'paid', label: 'Paid', color: '#16a34a' }]} fmt={money} /></div>
                  <div><h3>Earnings by project</h3><BarChart data={charts.projects} series={[{ key: 'v', label: 'Tracked earnings' }]} fmt={money} /></div>
                  <div><h3>Monthly payment history</h3><BarChart data={charts.pay} series={[{ key: 'v', label: 'Paid', color: '#16a34a' }]} fmt={money} /></div>
                </div>
              </section>

              <section>
                <h2>Weekly statements</h2>
                {weekRows.length ? <div className="stmt-list">{stmtList(weekRows, 'week').map((w) => <Link key={w.start} className="row-card stmt" to={`/earnings/statements/week/${w.start}`}><div className="grow"><h3>{weekLabel(w.start)}</h3><p>{hoursLabel(w.seconds)} · {money(w.tracked)} tracked</p></div><Icon name="fa-chevron-right" /></Link>)}</div> : <EmptyState icon="fa-file-lines" title="No weekly statements yet">A statement appears for every week in which you record working time.</EmptyState>}
                <h2>Monthly statements</h2>
                {monthRows.length ? <div className="stmt-list">{stmtList(monthRows, 'month').map((m) => <Link key={m.start} className="row-card stmt" to={`/earnings/statements/month/${m.start}`}><div className="grow"><h3>{monthLabel(m.start)}</h3><p>{hoursLabel(m.seconds)} · {money(m.tracked)} tracked</p></div><Icon name="fa-chevron-right" /></Link>)}</div> : <EmptyState icon="fa-file-lines" title="No monthly statements yet">Monthly statements appear once you have worked.</EmptyState>}
              </section>

              <section>
                <div className="section-title"><h2>Payment history</h2>
                  {payments.length > 0 && <button className="btn secondary" onClick={() => historyPdf(payments, profile.displayName).catch((e) => toast.error(e.message))}><Icon name="fa-file-pdf" /> Download history (PDF)</button>}</div>
                {payments.length ? (
                  <div className="table-wrap"><table>
                    <thead><tr>{['Reference', 'Project', 'Hours', 'Amount', 'Payment date', 'Method', 'Status', ''].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                    <tbody>{payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.paymentRef}</td><td>{p.assignments?.tasks?.title}</td><td>{hoursLabel(p.seconds)}</td><td><strong>{money(p.amount)}</strong></td>
                        <td>{fmtDate(p.cycleDate)}{p.carriedForward && <small className="muted"> carried forward</small>}</td><td>{p.method || '—'}</td>
                        <td><StatusPill kind="payment" value={p.status} />{p.status === 'failed' && <small className="bad-text-d"><br />{p.failureReason}. Check your payment settings or contact support.</small>}</td>
                        <td><button className="link-btn" onClick={() => receiptPdf(p, profile.displayName).catch((e) => toast.error(e.message))}>Receipt</button></td>
                      </tr>))}</tbody>
                  </table></div>
                ) : <EmptyState icon="fa-receipt" title="No payments yet" action={<Link className="btn" to="/projects">Go to My Projects</Link>}>When an administrator approves your submitted work, the payment appears here.</EmptyState>}
              </section>
              <p className="muted small">Payments are processed on the last Tuesday of every month to eligible United States bank or AirTM accounts, after approved work, verified hours and administrator payment approval. Week ranges: {weekLabel(mondayOf(todayIso()))} (this week).</p>
            </>
          )
        }}
      </Loaded>
    </>
  )
}
