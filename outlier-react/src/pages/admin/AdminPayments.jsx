import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useProfiles } from '../../hooks/useNames'
import { useToast } from '../../context/ToastContext'
import * as paymentsApi from '../../services/payments'
import * as assignmentsApi from '../../services/assignments'
import * as payoutApi from '../../services/payout'
import { PAYMENT_STATUS } from '../../utils/status'
import { fmtDate, hoursLabel, money } from '../../utils/format'
import { EmptyState, Loaded, StatusPill } from '../../components/ui'
import FormDialog from '../../components/FormDialog'

export default function AdminPayments() {
  const toast = useToast()
  const { nameOf } = useProfiles()
  const [filter, setFilter] = useState('action')
  const [dialog, setDialog] = useState(null)
  const query = useAsync(async () => {
    const [payments, assignments, banks] = await Promise.all([paymentsApi.listAll(), assignmentsApi.listAll(), payoutApi.listAll()])
    return { payments, assignments, banks }
  }, [], { refreshOnFocus: true })

  return (
    <Loaded query={query}>
      {({ payments, assignments, banks }) => {
        const sum = (...st) => payments.filter((p) => st.includes(p.status)).reduce((t, p) => t + Number(p.amount), 0)
        const rows = payments.filter((p) => filter === 'all' || (filter === 'action' ? ['pending', 'approved'].includes(p.status) : p.status === filter))
        const bank = (uid) => banks.find((b) => b.userId === uid)
        return (
          <>
            <div className="toolbar">
              <select aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="action">Needs action</option><option value="all">All</option>
                {Object.entries(PAYMENT_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <p className="muted">Awaiting approval {money(sum('pending'))} · Approved, unpaid {money(sum('approved'))} · Paid {money(sum('paid'))}</p>
            {rows.length ? rows.map((p) => {
              const a = assignments.find((x) => x.id === p.assignmentId)
              const b = bank(p.userId)
              return (
                <div className="row-card app-row" key={p.id}>
                  <div className="grow">
                    <h3>{money(p.amount)} · {nameOf(p.userId)}</h3>
                    <p>{a?.tasks?.title} · {hoursLabel(p.seconds)} approved × {money(p.hourlyRate)}/hr · {fmtDate(p.createdAt)}</p>
                    <p className="muted">Bank account: {b ? <><StatusPill kind="bank" value={b.status} /> {b.bankName} ••••{b.accountLast4}</> : 'none on file'}</p>
                    {p.reference && <p className="note">Reference: {p.reference}</p>}
                    {p.note && <p className="note">Note: {p.note}</p>}
                  </div>
                  <StatusPill kind="payment" value={p.status} />
                  {p.status === 'pending' && <div className="inline-actions"><button className="btn" onClick={() => setDialog({ type: 'approve', p })}>Approve payment</button><button className="btn secondary danger-text" onClick={() => setDialog({ type: 'reject', p })}>Reject</button></div>}
                  {p.status === 'approved' && <button className="btn" disabled={b?.status !== 'verified'} title={b?.status !== 'verified' ? 'The tasker needs a verified bank account' : ''} onClick={() => setDialog({ type: 'paid', p })}>Mark as paid</button>}
                </div>
              )
            }) : <EmptyState icon="fa-money-bill-wave" title="Nothing here">No payments match this filter.</EmptyState>}

            {dialog && (dialog.type === 'paid' ? (
              <FormDialog title={`Mark ${money(dialog.p.amount)} as paid`} intro="Only after the money has actually been sent to the tasker's verified bank account. This app does not move money." confirmLabel="Mark as paid" onClose={() => setDialog(null)}
                fields={[{ name: 'reference', label: 'Transfer reference / transaction ID', required: true, maxLength: 120 }]}
                validate={(d) => ({ reference: d.reference.length < 3 ? 'Enter the transaction reference (3+ characters).' : '' })}
                onSubmit={async (d) => { await paymentsApi.review(dialog.p.id, { status: 'paid', reference: d.reference, note: dialog.p.note }); toast.success('Payment marked as paid.'); query.reload() }} />
            ) : (
              <FormDialog title={dialog.type === 'approve' ? `Approve payment of ${money(dialog.p.amount)}?` : 'Reject payment?'} danger={dialog.type === 'reject'} confirmLabel={dialog.type === 'approve' ? 'Approve' : 'Reject'} onClose={() => setDialog(null)}
                intro={dialog.type === 'approve' ? 'This authorises the payout. Send the money, then record it with "Mark as paid".' : 'The tasker will see this payment as not approved.'}
                fields={[{ name: 'note', label: dialog.type === 'reject' ? 'Reason' : 'Note (optional)', type: 'textarea', maxLength: 300, required: dialog.type === 'reject' }]}
                onSubmit={async (d) => { await paymentsApi.review(dialog.p.id, { status: dialog.type === 'approve' ? 'approved' : 'rejected', note: d.note }); toast.success(dialog.type === 'approve' ? 'Payment approved.' : 'Payment rejected.'); query.reload() }} />
            ))}
          </>
        )
      }}
    </Loaded>
  )
}
