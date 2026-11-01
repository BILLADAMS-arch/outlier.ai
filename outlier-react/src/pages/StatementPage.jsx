import { Link, useParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as earningsApi from '../services/earnings'
import { addDays, addMonths, monthEnd, monthLabel, parse, weekLabel } from '../utils/dates'
import { fmtDate, hoursLabel, money } from '../utils/format'
import { statementPdf } from '../utils/pdf'
import { EmptyState, Icon, Loaded, PageHeader, StatusPill } from '../components/ui'

/** One weekly or monthly statement, calculated on the server from the tasker's own working sessions and payments. */
export default function StatementPage() {
  const { kind, start } = useParams()
  const toast = useToast()
  const { user } = useAuth()
  const ok = (kind === 'week' || kind === 'month') && !Number.isNaN(+parse(start))
  const from = ok ? (kind === 'month' ? `${start.slice(0, 7)}-01` : start) : ''
  const to = ok ? (kind === 'month' ? monthEnd(from) : addDays(from, 6)) : ''
  const query = useAsync(() => (ok ? earningsApi.statement(from, to, user.id) : Promise.resolve(null)), [kind, start, user.id])
  if (!ok) return <EmptyState icon="fa-circle-question" title="Statement not found" action={<Link className="btn" to="/earnings">My earnings</Link>} />
  const prev = kind === 'week' ? addDays(from, -7) : addMonths(from, -1)
  const next = kind === 'week' ? addDays(from, 7) : addMonths(from, 1)
  return (
    <>
      <PageHeader title={kind === 'week' ? 'Weekly earnings statement' : 'Monthly earnings statement'} actions={<Link className="btn secondary" to="/earnings">All earnings</Link>}>
        {kind === 'week' ? weekLabel(from) : monthLabel(from)} · USD
      </PageHeader>
      <div className="inline-actions"><Link className="btn secondary" to={`/earnings/statements/${kind}/${prev}`}><Icon name="fa-chevron-left" /> Previous</Link><Link className="btn secondary" to={`/earnings/statements/${kind}/${next}`}>Next <Icon name="fa-chevron-right" /></Link></div>
      <Loaded query={query}>
        {(st) => (
          <>
            <div className="panel">
              <dl className="kv"><dt>Statement reference</dt><dd>{st.reference}</dd><dt>Tasker</dt><dd>{st.taskerName}</dd><dt>Period</dt><dd>{fmtDate(st.from)} – {fmtDate(st.to)}</dd><dt>Generated</dt><dd>{new Date(st.generatedAt).toLocaleString()}</dd></dl>
              <button className="btn" onClick={() => statementPdf(st, kind).catch((e) => toast.error(e.message))}><Icon name="fa-file-pdf" /> Download PDF</button>
            </div>
            <section className="stats">
              {[['Hours worked', hoursLabel(st.totals.seconds)], ['Tracked earnings', money(st.totals.tracked)], ['Pending approval', money(st.totals.pending)], ['Approved for payment', money(st.totals.approved)], ['Paid', money(st.totals.paid)], ['Projects', st.totals.projects]].map(([l, v]) => <div className="stat-card" key={l}><span>{l}</span><div className="value">{v}</div></div>)}
            </section>
            <h2>Project breakdown</h2>
            {st.projects.length ? <div className="table-wrap"><table><thead><tr>{['Project', 'Hours', 'Rate', 'Earnings', 'Pending', 'Approved', 'Paid', 'Status'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
              <tbody>{st.projects.map((p) => <tr key={p.title + p.rate}><td>{p.title}</td><td>{(p.seconds / 3600).toFixed(2)}</td><td>{money(p.rate)}/hr</td><td>{money(p.tracked)}</td><td>{money(p.pending)}</td><td>{money(p.approved)}</td><td>{money(p.paid)}</td><td>{p.paymentStatus ? <StatusPill kind="payment" value={p.paymentStatus} /> : 'In progress'}</td></tr>)}</tbody></table></div>
              : <EmptyState icon="fa-clock" title="No working time in this period">Nothing was tracked between these dates.</EmptyState>}
            {st.weeks.length > 0 && <><h2>Weekly summary</h2><div className="table-wrap"><table><thead><tr>{['Week', 'Hours', 'Earnings', 'Pending', 'Approved', 'Paid'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
              <tbody>{st.weeks.map((w) => <tr key={w.start}><td><Link to={`/earnings/statements/week/${w.start}`}>{weekLabel(w.start)}</Link></td><td>{(w.seconds / 3600).toFixed(2)}</td><td>{money(w.tracked)}</td><td>{money(w.pending)}</td><td>{money(w.approved)}</td><td>{money(w.paid)}</td></tr>)}</tbody></table></div></>}
            {st.payments.length > 0 && <><h2>Payments recorded in this period</h2><div className="table-wrap"><table><thead><tr>{['Reference', 'Payment date', 'Method', 'Amount', 'Status'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
              <tbody>{st.payments.map((p) => <tr key={p.reference}><td>{p.reference}</td><td>{fmtDate(p.cycleDate)}</td><td>{p.method || '—'}</td><td>{money(p.amount)}</td><td><StatusPill kind="payment" value={p.status} /></td></tr>)}</tbody></table></div></>}
            <p className="muted small">Pending and approved amounts are allocated to weeks in proportion to the time worked in each. Approved earnings are not payments already made.</p>
          </>
        )}
      </Loaded>
    </>
  )
}
