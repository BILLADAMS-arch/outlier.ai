import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { useProfiles } from '../../hooks/useNames'
import { useToast } from '../../context/ToastContext'
import * as assignmentsApi from '../../services/assignments'
import * as workspaceApi from '../../services/workspace'
import * as tasksApi from '../../services/tasks'
import { configFor, missingItems, WORKSPACE_TYPES } from '../../utils/workspaceTypes'
import { earningsFor, fmtDateTime, hms, hoursLabel, money } from '../../utils/format'
import { EmptyState, Icon, Loaded, StatusPill } from '../../components/ui'
import FormDialog from '../../components/FormDialog'
import ToolRenderer from '../../components/workspace/tools'
import { SessionList } from '../../components/workspace/Dialogs'

const noop = () => {}
/** Administrators review a submission: the saved work exactly as submitted, files, sessions and time, with audited decisions. */
export default function AdminReview() {
  const { assignmentId } = useParams()
  const toast = useToast()
  const { nameOf } = useProfiles()
  const [dialog, setDialog] = useState(null)
  const [round, setRound] = useState(null)
  const query = useAsync(async () => {
    const a = await assignmentsApi.get(assignmentId)
    if (!a) return null
    const [subs, adjustments, resources, files, state, categories] = await Promise.all([workspaceApi.listSubmissions(assignmentId), workspaceApi.listAdjustments(assignmentId), workspaceApi.listResources(a.taskId), workspaceApi.listFiles(assignmentId), assignmentsApi.timerState(assignmentId), tasksApi.listCategories()])
    return { a, subs, adjustments, resources, files, state, categories }
  }, [assignmentId], { refreshOnFocus: true })

  return (
    <Loaded query={query}>
      {(d) => {
        if (!d) return <EmptyState icon="fa-circle-question" title="Project not found" action={<Link className="btn" to="/admin/work">Back</Link>} />
        const { a, subs, adjustments, resources, files, state } = d
        const cfg = configFor(a.tasks)
        const sub = subs.find((s) => s.round === (round ?? subs[0]?.round)) || null
        const snapFiles = (sub ? sub.files : files).map((f) => ({ ...f, removedAt: null }))
        const ws = { data: sub?.data || {}, progress: sub?.progress || {}, notes: sub?.notes || '', set: noop, setProgress: noop, setNotes: noop }
        const ctx = { assignmentId: a.id, readOnly: true, files: snapFiles, reloadFiles: noop, resources, showHistory: noop }
        const submitted = sub?.trackedSeconds ?? a.submittedSeconds ?? 0
        const missing = sub ? missingItems(cfg, sub.data, sub.progress, snapFiles) : []
        const open = a.status === 'submitted'
        const done = () => query.reload()
        return (
          <>
            <Link className="link-btn" to="/admin/work">← Work &amp; hours</Link>
            <div className="page-header between"><div><h1>{a.tasks.title}</h1><p>{nameOf(a.userId)} · {WORKSPACE_TYPES[cfg.type].label} · <StatusPill value={a.status} /></p></div></div>
            <section className="metrics">
              <div className="metric"><span>Tracked time (all sessions)</span><strong>{hoursLabel(state.trackedSeconds)}</strong></div>
              <div className="metric"><span>Submitted time</span><strong>{hoursLabel(submitted)}</strong></div>
              <div className="metric"><span>Approved payable time</span><strong>{a.approvedSeconds == null ? '—' : hoursLabel(a.approvedSeconds)}</strong></div>
              <div className="metric"><span>Rate</span><strong>{money(a.agreedRate)}/hr</strong></div>
              <div className="metric"><span>Value at submitted time</span><strong>{money(earningsFor(submitted, a.agreedRate))}</strong></div>
            </section>
            {open && (
              <div className="panel inline-actions">
                <button className="btn" onClick={() => setDialog('approve')}><Icon name="fa-check" /> Approve work</button>
                <button className="btn secondary" onClick={() => setDialog('revise')}>Request revisions</button>
                <button className="btn secondary danger-text" onClick={() => setDialog('reject')}>Reject</button>
              </div>
            )}
            {missing.length > 0 && <div className="callout">The submitted work is missing: {missing.join('; ')}.</div>}
            {subs.length === 0 && <EmptyState icon="fa-inbox" title="Nothing submitted yet">The tasker&apos;s current saved work is shown below. It becomes reviewable once submitted.</EmptyState>}
            {subs.length > 1 && <div className="tabs wrap">{subs.map((s) => <button key={s.id} className={`tab-link${s.round === (sub?.round) ? ' active' : ''}`} onClick={() => setRound(s.round)}>Round {s.round} · {s.status.replace('_', ' ')}</button>)}</div>}
            {sub && <div className="panel"><h2>Submission, round {sub.round}</h2><p>{sub.summary}</p>{sub.link && <p><a href={sub.link} target="_blank" rel="noopener noreferrer">Extra material</a></p>}<p className="muted small">Submitted {fmtDateTime(sub.submittedAt)} · tracked {hoursLabel(sub.trackedSeconds)} · status {sub.status.replace('_', ' ')}</p></div>}
            <div className="panel ws-center"><div className="ws-tool-title"><Icon name={WORKSPACE_TYPES[cfg.type].icon} /> Submitted work (read only)</div><ToolRenderer cfg={cfg} ws={ws} ctx={ctx} />{ws.notes && <><h3>Tasker notes</h3><p>{ws.notes}</p></>}</div>
            {sub?.reviewComments?.length > 0 && <div className="panel"><h2>Review comments</h2><ul className="mini-list">{sub.reviewComments.map((c) => <li key={c.id}><span><b>{c.kind}</b>: {c.body}</span><span className="muted small">{fmtDateTime(c.createdAt)}</span></li>)}</ul></div>}
            <div className="panel"><h2>Working sessions</h2><SessionList assignmentId={a.id} refreshKey={0} /><p className="muted small">Server timestamps. Paused periods are never counted. Total {hms(state.trackedSeconds)}.</p></div>
            <div className="panel"><h2>Hour adjustments (audit log)</h2>
              {adjustments.length ? <ul className="mini-list">{adjustments.map((x) => <li key={x.id}><span>{nameOf(x.adminId)}: {hoursLabel(x.originalSeconds)} → {hoursLabel(x.adjustedSeconds)} — {x.reason}</span><span className="muted small">{fmtDateTime(x.createdAt)}</span></li>)}</ul> : <p className="muted small">No adjustments.</p>}</div>

            {dialog === 'approve' && (
              <FormDialog title="Approve work" confirmLabel="Approve and create payment" onClose={() => setDialog(null)} intro={`Submitted time: ${hoursLabel(submitted)}. Approved hours × ${money(a.agreedRate)}/hr become the payment. Approving less than was submitted needs a reason, which is logged.`}
                initial={{ hours: (submitted / 3600).toFixed(2) }}
                fields={[{ name: 'hours', label: 'Approved payable hours', type: 'number', min: 0, step: 0.01, required: true }, { name: 'reason', label: 'Reason for any adjustment', type: 'textarea', maxLength: 300 }, { name: 'note', label: 'Note to tasker (optional)', type: 'textarea', maxLength: 300 }]}
                validate={(v) => { const secs = Math.round(Number(v.hours) * 3600); return { hours: !(secs >= 0) || secs > submitted + 1 ? `Enter between 0 and ${(submitted / 3600).toFixed(2)} hours.` : '', reason: Math.abs(secs - submitted) > 1 && v.reason.length < 3 ? 'A reason is required when you change the hours.' : '' } }}
                onSubmit={async (v) => { const secs = Math.min(submitted, Math.round(Number(v.hours) * 3600)); await assignmentsApi.approveWork(a.id, secs, v.note, v.reason); toast.success('Work approved. A payment is awaiting approval.'); done() }} />
            )}
            {dialog === 'revise' && <FormDialog title="Request revisions" intro="Your comment is saved with the submission. The original submission is preserved, and the tasker continues in a new tracked session." confirmLabel="Send back" onClose={() => setDialog(null)}
              fields={[{ name: 'note', label: 'What needs to change?', type: 'textarea', required: true, maxLength: 500 }]} onSubmit={async (v) => { await assignmentsApi.requestChanges(a.id, v.note); toast.success('Sent back for revisions.'); done() }} />}
            {dialog === 'reject' && <FormDialog title="Reject this work?" danger intro="The tasker is told it was not approved. No payment is created." confirmLabel="Reject work" onClose={() => setDialog(null)}
              fields={[{ name: 'note', label: 'Reason', type: 'textarea', required: true, maxLength: 500 }]} onSubmit={async (v) => { await workspaceApi.rejectWork(a.id, v.note); toast.success('Work rejected.'); done() }} />}
          </>
        )
      }}
    </Loaded>
  )
}
