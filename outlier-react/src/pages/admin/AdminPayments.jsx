import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useProfiles } from '../../hooks/useNames'
import { useToast } from '../../context/ToastContext'
import * as earningsApi from '../../services/earnings'
import * as payoutApi from '../../services/payout'
import { PAYMENT_STATUS } from '../../utils/status'
import { fmtDate, hoursLabel, money } from '../../utils/format'
import { EmptyState, Loaded, StatusPill } from '../../components/ui'
import FormDialog from '../../components/FormDialog'

/** Payment lifecycle: awaiting approval -> approved for payment -> processing -> paid (or failed). Paid is recorded only with a transfer reference. */
export default function AdminPayments() {
  const toast = useToast()
  const { nameOf } = useProfiles()
  const [filter, setFilter] = useState('action')
  const [dialog, setDialog] = useState(null)
  const query = useAsync(async () => ({ payments: await earningsApi.listPayments(), banks: await payoutApi.listAll() }), [], { refreshOnFocus: true })
  const done = (msg) => { toast.success(msg); query.reload() }

  return (
    <Loaded query={query}>
      {({ payments, banks }) => {
        const sum = (...st) => payments.filter((p) => st.includes(p.status)).reduce((t, p) => t + Number(p.amount), 0)
        const rows = payments.filter((p) => filter === 'all' || (filter === 'action' ? ['pending', 'approved', 'processing', 'failed'].includes(p.status) : p.status === filter))
        const bank = (uid) => banks.find((b) => b.userId === uid)
        const upd = (p, patch, msg) => ({ onSubmit: async (d) => { await earningsApi.updatePayment(p.id, typeof patch === 'function' ? patch(d) : patch); done(msg) } })
        return (
          <>
            <div className="toolbar"><select aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="action">Needs action</option><option value="all">All</option>{Object.entries(PAYMENT_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <p className="muted">Awaiting approval {money(sum('pending'))} · Approved for payment {money(sum('approved'))} · Processing {money(sum('processing'))} · Failed {money(sum('failed'))} · Paid {money(sum('paid'))}</p>
            {rows.length ? rows.map((p) => {
              const b = bank(p.userId)
              return (
                <div className="row-card app-row" key={p.id}>
                  <div className="grow">
                    <h3>{money(p.amount)} · {nameOf(p.userId)} <small className="muted">{p.paymentRef}</small></h3>
                    <p>{p.assignments?.tasks?.title} · {hoursLabel(p.seconds)} × {money(p.hourlyRate)}/hr · payment date {fmtDate(p.cycleDate)}{p.carriedForward ? ' (carried forward)' : ''}</p>
                    <p className="muted">Payout account: {b ? <><StatusPill kind="bank" value={b.status} /> {b.method === 'airtm' ? `AirTM ${b.displayMask}` : `${b.bankName} ••••${b.accountLast4}`}</> : 'none on file'}</p>
                    {p.failureReason && <p className="note">Failure: {p.failureReason}</p>}
                    {p.reference && <p className="note">Transfer reference: {p.reference}</p>}
                    {p.note && <p className="note">Note: {p.note}</p>}
                  </div>
                  <StatusPill kind="payment" value={p.status} />
                  <div className="inline-actions">
                    {p.status === 'pending' && <><button className="btn" onClick={() => setDialog({ type: 'approve', p })}>Approve payment</button><button className="btn secondary" onClick={() => setDialog({ type: 'adjust', p })}>Adjust hours</button><button className="btn secondary danger-text" onClick={() => setDialog({ type: 'reject', p })}>Reject</button></>}
                    {p.status === 'approved' && <button className="btn" onClick={() => setDialog({ type: 'processing', p })}>Start processing</button>}
                    {p.status === 'processing' && <><button className="btn" disabled={b?.status !== 'verified'} title={b?.status !== 'verified' ? 'The tasker needs a verified payout account' : ''} onClick={() => setDialog({ type: 'paid', p })}>Record as paid</button><button className="btn secondary danger-text" onClick={() => setDialog({ type: 'failed', p })}>Record failure</button></>}
                    {p.status === 'failed' && <button className="btn" onClick={() => setDialog({ type: 'processing', p })}>Retry processing</button>}
                  </div>
                </div>
              )
            }) : <EmptyState icon="fa-money-bill-wave" title="Nothing here">No payments match this filter.</EmptyState>}

            {dialog?.type === 'approve' && <FormDialog title={`Approve payment of ${money(dialog.p.amount)}?`} intro="This approves the earnings for payment. If the cycle's approval deadline has passed, the payment moves to the next cycle and the tasker is told." confirmLabel="Approve" onClose={() => setDialog(null)} fields={[{ name: 'note', label: 'Note (optional)', type: 'textarea', maxLength: 300 }]} {...upd(dialog.p, (d) => ({ status: 'approved', note: d.note }), 'Payment approved.')} />}
            {dialog?.type === 'reject' && <FormDialog title="Reject payment?" danger confirmLabel="Reject" onClose={() => setDialog(null)} fields={[{ name: 'note', label: 'Reason', type: 'textarea', required: true, maxLength: 300 }]} {...upd(dialog.p, (d) => ({ status: 'rejected', note: d.note }), 'Payment rejected.')} />}
            {dialog?.type === 'processing' && <FormDialog title="Start processing?" intro="The tasker is told the payment is processing. It is not completed until you record it as paid." confirmLabel="Start processing" onClose={() => setDialog(null)} {...upd(dialog.p, { status: 'processing' }, 'Payment is processing.')} />}
            {dialog?.type === 'paid' && <FormDialog title={`Record ${money(dialog.p.amount)} as paid`} intro="Only after the money was actually sent to the tasker's verified account. This app does not move money; the reference is your documented confirmation." confirmLabel="Record payment" onClose={() => setDialog(null)}
              fields={[{ name: 'reference', label: 'Transfer reference / transaction ID', required: true, maxLength: 120 }]} validate={(d) => ({ reference: d.reference.length < 3 ? 'Enter the reference (3+ characters).' : '' })} {...upd(dialog.p, (d) => ({ status: 'paid', reference: d.reference }), 'Payment recorded as paid.')} />}
            {dialog?.type === 'failed' && <FormDialog title="Record a failed payment" intro="The tasker is told why and what to do." danger confirmLabel="Record failure" onClose={() => setDialog(null)} fields={[{ name: 'reason', label: 'Why did it fail?', type: 'textarea', required: true, maxLength: 300 }]} {...upd(dialog.p, (d) => ({ status: 'failed', failureReason: d.reason }), 'Failure recorded.')} />}
            {dialog?.type === 'adjust' && <FormDialog title="Adjust approved hours" intro={`Currently ${hoursLabel(dialog.p.seconds)} = ${money(dialog.p.amount)}. The change is recorded in the audit log with your reason.`} confirmLabel="Adjust" onClose={() => setDialog(null)}
              initial={{ hours: (dialog.p.seconds / 3600).toFixed(2) }} fields={[{ name: 'hours', label: 'New approved hours', type: 'number', min: 0, step: 0.01, required: true }, { name: 'reason', label: 'Reason (logged)', type: 'textarea', required: true, maxLength: 300 }]}
              validate={(d) => ({ hours: !(Number(d.hours) >= 0) ? 'Enter a valid number of hours.' : '', reason: d.reason.length < 3 ? 'A reason is required.' : '' })}
              onSubmit={async (d) => { await earningsApi.adjustPayment(dialog.p.id, Math.round(Number(d.hours) * 3600), d.reason); done('Payment adjusted and logged.') }} />}
          </>
        )
      }}
    </Loaded>
  )
}
