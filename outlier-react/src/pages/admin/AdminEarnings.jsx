import { useMemo, useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useProfiles } from '../../hooks/useNames'
import { useToast } from '../../context/ToastContext'
import * as earningsApi from '../../services/earnings'
import { addMonths, monthEnd, monthLabel, monthStart, todayIso, weekLabel } from '../../utils/dates'
import { download, toCsv } from '../../utils/csv'
import { fmtDate, fmtDateTime, hoursLabel, money } from '../../utils/format'
import { statementPdf } from '../../utils/pdf'
import { EmptyState, Icon, Loaded } from '../../components/ui'
import FormDialog from '../../components/FormDialog'
import { Link } from 'react-router-dom'

export default function AdminEarnings() {
  const toast = useToast()
  const { nameOf } = useProfiles()
  const [month, setMonth] = useState(monthStart(todayIso()))
  const [taskerId, setTaskerId] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const query = useAsync(async () => {
    const [rows, summary, payments, adj, tadj] = await Promise.all([earningsApi.rows(month, monthEnd(month), 'month'), earningsApi.summary(), earningsApi.listPayments(), earningsApi.listAdjustments(), earningsApi.listTimeAdjustments()])
    return { rows, summary, payments, adj, tadj }
  }, [month], { refreshOnFocus: true })
  const stmt = useAsync(() => (taskerId ? earningsApi.statement(month, monthEnd(month), taskerId) : Promise.resolve(null)), [taskerId, month])

  const perTasker = useMemo(() => {
    const m = new Map()
    for (const r of query.data?.rows || []) {
      const t = m.get(r.userId) || { id: r.userId, name: r.userName, seconds: 0, tracked: 0, pending: 0, approved: 0, paid: 0, projects: new Set() }
      t.seconds += r.seconds; t.tracked += r.trackedAmount; t.pending += r.pendingAmount; t.approved += r.approvedAmount; t.paid += r.paidAmount; t.projects.add(r.assignmentId); m.set(r.userId, t)
    }
    return [...m.values()].sort((a, b) => b.tracked - a.tracked)
  }, [query.data])

  const run = async (fn, msg) => { try { const n = await fn(); toast.success(typeof n === 'number' ? `${msg}: ${n} payment${n === 1 ? '' : 's'}.` : msg); query.reload() } catch (e) { toast.error(e.message) } }
  const exportReport = (payments) => download(`payments-${month.slice(0, 7)}.csv`, toCsv([
    { key: 'ref', label: 'Reference' }, { key: 'tasker', label: 'Tasker' }, { key: 'project', label: 'Project' }, { key: 'hours', label: 'Approved hours' }, { key: 'rate', label: 'Rate USD' }, { key: 'amount', label: 'Amount USD' },
    { key: 'status', label: 'Status' }, { key: 'cycle', label: 'Payment date' }, { key: 'method', label: 'Method' }, { key: 'transfer', label: 'Transfer reference' }, { key: 'carried', label: 'Carried forward' }, { key: 'paidAt', label: 'Paid at' }],
  payments.map((p) => ({ ref: p.paymentRef, tasker: nameOf(p.userId), project: p.assignments?.tasks?.title, hours: (p.seconds / 3600).toFixed(2), rate: p.hourlyRate, amount: p.amount, status: p.status, cycle: p.cycleDate, method: p.method || '', transfer: p.reference, carried: p.carriedForward ? 'yes' : 'no', paidAt: p.paidAt || '' }))), 'text/csv')

  return (
    <Loaded query={query}>
      {({ summary, payments, adj, tadj }) => {
        const cal = summary.calendar
        const cycle = cal.paymentDate
        const inCycle = payments.filter((p) => p.cycleDate === cycle)
        const failed = payments.filter((p) => p.status === 'failed')
        const monthPays = payments.filter((p) => p.cycleDate && p.cycleDate.slice(0, 7) === month.slice(0, 7))
        return (
          <>
            <section className="panel">
              <h2>Payment cycle</h2>
              <dl className="kv">
                <dt>Next payment date</dt><dd>{fmtDate(cal.paymentDate)} <small className="muted">(last Tuesday of the month)</small></dd><dt>Earnings cutoff</dt><dd>{fmtDate(cal.cutoffDate)}</dd>
                <dt>Payment approval deadline</dt><dd>{fmtDate(cal.approvalDeadline)}</dd><dt>Cycle status</dt><dd>{cal.status}</dd>
                <dt>Awaiting approval</dt><dd>{money(cal.pendingForCycle)}</dd><dt>Approved / processing / paid</dt><dd>{money(cal.approvedForCycle)} {cal.carriedForward > 0 && <small className="muted">({money(cal.carriedForward)} carried forward)</small>}</dd>
              </dl>
              <div className="inline-actions">
                <button className="btn" onClick={() => setConfirm({ title: 'Approve all pending payments for this cycle?', text: `Every payment awaiting approval for ${fmtDate(cycle)} will be approved. Approved after the deadline, they move to the next cycle.`, fn: () => run(() => earningsApi.approveBatch(cycle), 'Batch approved') })}>Approve batch</button>
                <button className="btn secondary" onClick={() => setConfirm({ title: 'Start processing approved payments?', text: 'Taskers are told their payment is processing. It is not completed until you record it as paid.', fn: () => run(() => earningsApi.startBatch(cycle), 'Processing started') })}>Start processing</button>
                <button className="btn secondary danger-text" onClick={() => setConfirm({ title: 'Carry unpaid payments forward?', text: 'Approved, processing and failed payments in this cycle move to the next one and taskers are notified.', fn: () => run(() => earningsApi.carryForward(cycle), 'Carried forward') })}>Carry forward unpaid</button>
                <Link className="btn secondary" to="/admin/payments">Review individual payments</Link>
              </div>
              <p className="muted small">{inCycle.length} payment{inCycle.length === 1 ? '' : 's'} in this cycle. Recording a payment as paid requires a verified payout account and a transfer reference.</p>
            </section>

            <div className="toolbar"><button className="btn secondary" onClick={() => setMonth(addMonths(month, -1))}><Icon name="fa-chevron-left" /></button><strong>{monthLabel(month)}</strong><button className="btn secondary" onClick={() => setMonth(addMonths(month, 1))}><Icon name="fa-chevron-right" /></button>
              <span className="grow" /><button className="btn secondary" onClick={() => exportReport(monthPays)}><Icon name="fa-file-export" /> Export payments for the month</button><button className="btn secondary" onClick={() => exportReport(payments)}>Export all</button></div>

            <h2>Tasker earnings, {monthLabel(month)}</h2>
            {perTasker.length ? <div className="table-wrap"><table><thead><tr>{['Tasker', 'Projects', 'Hours', 'Tracked', 'Pending', 'Approved', 'Paid', ''].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
              <tbody>{perTasker.map((t) => <tr key={t.id}><td>{t.name}</td><td>{t.projects.size}</td><td>{hoursLabel(t.seconds)}</td><td>{money(t.tracked)}</td><td>{money(t.pending)}</td><td>{money(t.approved)}</td><td>{money(t.paid)}</td><td><button className="link-btn" onClick={() => setTaskerId(t.id)}>Statements</button></td></tr>)}</tbody></table></div>
              : <EmptyState icon="fa-clock" title="No working time this month">Earnings appear as taskers record time.</EmptyState>}

            {taskerId && (
              <Loaded query={stmt}>
                {(st) => st && (
                  <section className="panel"><div className="section-title"><h2>Monthly statement: {st.taskerName}</h2><div className="inline-actions"><button className="btn secondary" onClick={() => statementPdf(st, 'month').catch((e) => toast.error(e.message))}><Icon name="fa-file-pdf" /> PDF</button><button className="btn secondary" onClick={() => setTaskerId(null)}>Close</button></div></div>
                    <p className="muted small">Reference {st.reference}. Weeks:</p>
                    <div className="table-wrap"><table><thead><tr>{['Week', 'Hours', 'Tracked', 'Pending', 'Approved', 'Paid'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{st.weeks.map((w) => <tr key={w.start}><td>{weekLabel(w.start)}</td><td>{(w.seconds / 3600).toFixed(2)}</td><td>{money(w.tracked)}</td><td>{money(w.pending)}</td><td>{money(w.approved)}</td><td>{money(w.paid)}</td></tr>)}</tbody></table></div>
                    <div className="table-wrap"><table><thead><tr>{['Project', 'Hours', 'Rate', 'Tracked', 'Status'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{st.projects.map((p) => <tr key={p.title}><td>{p.title}</td><td>{(p.seconds / 3600).toFixed(2)}</td><td>{money(p.rate)}/hr</td><td>{money(p.tracked)}</td><td>{p.paymentStatus || 'in progress'}</td></tr>)}</tbody></table></div>
                  </section>
                )}
              </Loaded>
            )}

            <h2>Failed payments ({failed.length})</h2>
            {failed.length ? failed.map((p) => <div className="row-card" key={p.id}><div className="grow"><h3>{money(p.amount)} · {nameOf(p.userId)}</h3><p>{p.paymentRef} · {p.failureReason}</p></div><Link className="btn secondary" to="/admin/payments">Resolve</Link></div>) : <p className="muted">None.</p>}

            <h2>Audit log</h2>
            <div className="panel"><h3>Payment adjustments</h3>
              {adj.length ? <ul className="mini-list">{adj.map((a) => <li key={a.id}><span>{nameOf(a.adminId)}: {money(a.originalAmount)} ({hoursLabel(a.originalSeconds)}) → {money(a.adjustedAmount)} ({hoursLabel(a.adjustedSeconds)}) — {a.reason}</span><span className="muted small">{fmtDateTime(a.createdAt)}</span></li>)}</ul> : <p className="muted small">None.</p>}
              <h3>Hours adjusted at work approval</h3>
              {tadj.length ? <ul className="mini-list">{tadj.map((a) => <li key={a.id}><span>{nameOf(a.adminId)}: {hoursLabel(a.originalSeconds)} → {hoursLabel(a.adjustedSeconds)} — {a.reason}</span><span className="muted small">{fmtDateTime(a.createdAt)}</span></li>)}</ul> : <p className="muted small">None.</p>}</div>

            {confirm && <FormDialog title={confirm.title} intro={confirm.text} confirmLabel="Confirm" onClose={() => setConfirm(null)} onSubmit={() => confirm.fn()} />}
          </>
        )
      }}
    </Loaded>
  )
}
