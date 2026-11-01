import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useProfiles } from '../../hooks/useNames'
import { useToast } from '../../context/ToastContext'
import * as payoutApi from '../../services/payout'
import { fmtDate } from '../../utils/format'
import { EmptyState, Loaded, StatusPill } from '../../components/ui'
import FormDialog from '../../components/FormDialog'

export default function AdminPayoutAccounts() {
  const toast = useToast()
  const { nameOf } = useProfiles()
  const [dialog, setDialog] = useState(null)
  const [revealed, setRevealed] = useState(null)
  const query = useAsync(payoutApi.listAll, [], { refreshOnFocus: true })

  async function reveal(b) {
    try { setRevealed({ b, data: await payoutApi.reveal(b.userId) }) } catch (e) { toast.error(e.message) }
  }
  return (
    <Loaded query={query}>
      {(banks) => (
        <>
          <p className="muted">Review each tasker&apos;s US bank account before approving payouts. Showing full numbers is logged against your account.</p>
          {banks.length ? banks.map((b) => (
            <div className="row-card" key={b.userId}>
              <div className="grow">
                <h3>{nameOf(b.userId)}</h3>
                <p>{b.accountHolder} · {b.bankName} · {b.accountType} ••••{b.accountLast4} · routing ••••{b.routingLast4} · added {fmtDate(b.createdAt)}</p>
                {b.reviewNote && <p className="note">Note: {b.reviewNote}</p>}
              </div>
              <StatusPill kind="bank" value={b.status} />
              <div className="inline-actions">
                {b.status !== 'verified' && <button className="btn" onClick={() => setDialog({ b, status: 'verified' })}>Verify</button>}
                {b.status !== 'rejected' && <button className="btn secondary danger-text" onClick={() => setDialog({ b, status: 'rejected' })}>Reject</button>}
                <button className="btn secondary" onClick={() => reveal(b)}>Show full details</button>
              </div>
            </div>
          )) : <EmptyState icon="fa-building-columns" title="No bank accounts yet">Taskers add them under Payment Settings.</EmptyState>}

          {dialog && (
            <FormDialog title={dialog.status === 'verified' ? 'Verify bank account' : 'Reject bank account'} danger={dialog.status === 'rejected'} confirmLabel={dialog.status === 'verified' ? 'Verify' : 'Reject'} onClose={() => setDialog(null)}
              intro={`${nameOf(dialog.b.userId)} · ${dialog.b.bankName} ••••${dialog.b.accountLast4}`}
              fields={[{ name: 'note', label: dialog.status === 'rejected' ? 'Reason (shown to the tasker)' : 'Note (optional)', type: 'textarea', maxLength: 300, required: dialog.status === 'rejected' }]}
              onSubmit={async (d) => { await payoutApi.review(dialog.b.userId, dialog.status, d.note); toast.success(dialog.status === 'verified' ? 'Account verified.' : 'Account rejected.'); query.reload() }} />
          )}
          {revealed && (
            <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setRevealed(null)}>
              <div className="modal" role="dialog" aria-modal="true" aria-label="Bank account details">
                <h2>Bank account details</h2>
                <p className="modal-intro">This view was recorded. Close it when you are done.</p>
                <dl className="kv">
                  <dt>Holder</dt><dd>{revealed.data.holder}</dd><dt>Bank</dt><dd>{revealed.data.bank}</dd><dt>Type</dt><dd>{revealed.data.type}</dd>
                  <dt>Routing</dt><dd>{revealed.data.routing}</dd><dt>Account</dt><dd>{revealed.data.account}</dd>
                </dl>
                <div className="modal-actions"><button className="btn" onClick={() => setRevealed(null)}>Close</button></div>
              </div>
            </div>
          )}
        </>
      )}
    </Loaded>
  )
}
