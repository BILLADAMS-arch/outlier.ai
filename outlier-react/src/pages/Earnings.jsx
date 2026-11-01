import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import * as paymentsApi from '../services/payments'
import * as assignmentsApi from '../services/assignments'
import { fmtDate, hoursLabel, money } from '../utils/format'
import { EmptyState, Icon, Loaded, PageHeader, StatusPill } from '../components/ui'
import CountUp from '../components/CountUp'

export default function Earnings() {
  const query = useAsync(async () => {
    const [payments, assignments] = await Promise.all([paymentsApi.listMine(), assignmentsApi.listMine()])
    return { payments, assignments }
  }, [], { refreshOnFocus: true })
  return (
    <>
      <PageHeader title="Your Earnings">Earnings = approved working hours × your hourly rate. An administrator approves your work, then the payment.</PageHeader>
      <Loaded query={query}>
        {({ payments, assignments }) => {
          const sum = (...st) => payments.filter((p) => st.includes(p.status)).reduce((t, p) => t + Number(p.amount), 0)
          const title = (id) => assignments.find((a) => a.id === id)?.tasks?.title || 'Project'
          return (
            <>
              <section className="stats">
                {[['fa-circle-check', 'Approved earnings', sum('pending', 'approved', 'paid')], ['fa-money-bill-transfer', 'Paid out', sum('paid')], ['fa-hourglass-half', 'Approved, awaiting payout', sum('approved')], ['fa-clock', 'Awaiting payment approval', sum('pending')]].map(([ic, l, v]) => (
                  <div className="stat-card" key={l}><Icon name={ic} /><span>{l}</span><div className="value"><CountUp value={v} format={money} /></div></div>
                ))}
              </section>
              <section>
                <h2>Payments</h2>
                {payments.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead><tr>{['Date', 'Project', 'Approved hours', 'Rate', 'Amount', 'Status', 'Reference'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id}>
                            <td>{fmtDate(p.createdAt)}</td><td>{title(p.assignmentId)}</td><td>{hoursLabel(p.seconds)}</td><td>{money(p.hourlyRate)}/hr</td>
                            <td><strong>{money(p.amount)}</strong></td><td><StatusPill kind="payment" value={p.status} /></td><td>{p.reference || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <EmptyState icon="fa-receipt" title="No earnings yet" action={<Link className="btn" to="/projects">Go to My Projects</Link>}>When an administrator approves your submitted work, the payment appears here.</EmptyState>}
              </section>
              <p className="muted">To receive payouts, add and verify a US bank account in <Link to="/payout">Payment Settings</Link>.</p>
            </>
          )
        }}
      </Loaded>
    </>
  )
}
