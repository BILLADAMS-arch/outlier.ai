import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useProfiles } from '../../hooks/useNames'
import { useToast } from '../../context/ToastContext'
import * as assignmentsApi from '../../services/assignments'
import { sumSegments, segmentSeconds } from '../../utils/time'
import { earningsFor, fmtDateTime, hms, hoursLabel, money } from '../../utils/format'
import { EmptyState, Loaded, StatusPill } from '../../components/ui'
import FormDialog from '../../components/FormDialog'

export default function AdminWork() {
  const toast = useToast()
  const { nameOf } = useProfiles()
  const [dialog, setDialog] = useState(null)
  const [filter, setFilter] = useState('all')
  const query = useAsync(async () => {
    const [assignments, segments, active] = await Promise.all([assignmentsApi.listAll(), assignmentsApi.listSegments(), assignmentsApi.activeSegments()])
    return { assignments, segments, active }
  }, [], { refreshOnFocus: true })
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); query.reload() } catch (e) { toast.error(e.message) } }

  return (
    <Loaded query={query}>
      {({ assignments, segments, active }) => {
        const tracked = (id) => sumSegments(segments.filter((s) => s.assignmentId === id))
        const submitted = assignments.filter((a) => a.status === 'submitted')
        const rows = assignments.filter((a) => filter === 'all' || a.status === filter)
        return (
          <>
            <h2>Active working sessions ({active.length})</h2>
            {active.length ? active.map((s) => (
              <div className="row-card" key={s.id}>
                <div className="grow"><h3>{nameOf(s.userId)}</h3><p>{s.assignments?.tasks?.title} · started {fmtDateTime(s.startedAt)}</p></div>
                <span className="timer-badge"><span className="dot-live" /> {hms(segmentSeconds({ startedAt: s.startedAt, endedAt: null }))}</span>
              </div>
            )) : <EmptyState icon="fa-clock" title="No one is working right now">Running timers appear here.</EmptyState>}

            <h2>Submitted for review ({submitted.length})</h2>
            {submitted.length ? submitted.map((a) => (
              <div className="row-card app-row" key={a.id}>
                <div className="grow">
                  <h3>{a.tasks?.title}</h3>
                  <p>{nameOf(a.userId)} · submitted {fmtDateTime(a.submittedAt)} · tracked {hoursLabel(tracked(a.id))} × {money(a.agreedRate)}/hr = {money(earningsFor(tracked(a.id), a.agreedRate))}</p>
                  <p className="note">{a.submissionNote}</p>
                  {a.submissionLink && <p><a href={a.submissionLink} target="_blank" rel="noopener noreferrer">Open deliverables</a></p>}
                </div>
                <div className="inline-actions">
                  <button className="btn" onClick={() => setDialog({ type: 'approve', a, secs: tracked(a.id) })}>Approve work</button>
                  <button className="btn secondary" onClick={() => setDialog({ type: 'changes', a })}>Request changes</button>
                </div>
              </div>
            )) : <EmptyState icon="fa-inbox" title="Nothing waiting for review">Submitted projects appear here.</EmptyState>}

            <div className="section-title"><h2>All projects &amp; tracked hours</h2>
              <select aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                {['all', 'assigned', 'in_progress', 'submitted', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</option>)}
              </select>
            </div>
            {rows.length ? (
              <div className="table-wrap"><table>
                <thead><tr>{['Tasker', 'Project', 'Status', 'Tracked', 'Approved', 'Earnings', ''].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                <tbody>{rows.map((a) => (
                  <tr key={a.id}>
                    <td>{nameOf(a.userId)}</td><td>{a.tasks?.title}</td><td><StatusPill value={a.status} /></td><td>{hoursLabel(tracked(a.id))}</td>
                    <td>{a.approvedSeconds == null ? '—' : hoursLabel(a.approvedSeconds)}</td>
                    <td>{a.status === 'completed' ? money(earningsFor(a.approvedSeconds, a.agreedRate)) : `${money(earningsFor(tracked(a.id), a.agreedRate))} est.`}</td>
                    <td>{!['completed', 'cancelled'].includes(a.status) && <button className="link-btn danger-text" onClick={() => setDialog({ type: 'cancel', a })}>Cancel</button>}</td>
                  </tr>))}</tbody>
              </table></div>
            ) : <EmptyState icon="fa-folder-open" title="No projects">Assigned and approved projects appear here.</EmptyState>}

            {dialog?.type === 'approve' && (
              <FormDialog title="Approve work" confirmLabel="Approve and create payment" onClose={() => setDialog(null)}
                intro={`Tracked time: ${hoursLabel(dialog.secs)} (${hms(dialog.secs)}). Approved hours × ${money(dialog.a.agreedRate)}/hr become the payment, which you then approve separately.`}
                initial={{ hours: (dialog.secs / 3600).toFixed(2) }}
                fields={[{ name: 'hours', label: 'Approved hours', type: 'number', min: 0, step: 0.01, required: true, hint: 'You can approve less than the tracked time, never more.' }, { name: 'note', label: 'Note to tasker (optional)', type: 'textarea', maxLength: 300 }]}
                validate={(d) => {
                  const secs = Math.round(Number(d.hours) * 3600)
                  return { hours: !(secs >= 0) || secs > dialog.secs + 1 ? `Enter between 0 and ${(dialog.secs / 3600).toFixed(2)} hours.` : '' }
                }}
                onSubmit={async (d) => { const secs = Math.min(dialog.secs, Math.round(Number(d.hours) * 3600)); await assignmentsApi.approveWork(dialog.a.id, secs, d.note); toast.success('Work approved. A payment is awaiting your approval.'); query.reload() }} />
            )}
            {dialog?.type === 'changes' && (
              <FormDialog title="Request changes" intro="The project goes back to the tasker, who can keep working and submit again." confirmLabel="Send back" onClose={() => setDialog(null)}
                fields={[{ name: 'note', label: 'What needs to change?', type: 'textarea', required: true, maxLength: 500 }]}
                onSubmit={async (d) => { await assignmentsApi.requestChanges(dialog.a.id, d.note); toast.success('Sent back to the tasker.'); query.reload() }} />
            )}
            {dialog?.type === 'cancel' && (
              <FormDialog title="Cancel this project?" intro="Any running timer stops and the tasker can no longer work on it." danger confirmLabel="Cancel project" onClose={() => setDialog(null)}
                fields={[{ name: 'note', label: 'Reason (shown to the tasker)', type: 'textarea', maxLength: 300 }]}
                onSubmit={(d) => act(() => assignmentsApi.cancel(dialog.a.id, d.note), 'Project cancelled.')} />
            )}
          </>
        )
      }}
    </Loaded>
  )
}
