import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import * as workspaceApi from '../../services/workspace'
import { earningsFor, fmtDateTime, hms, hoursLabel, money } from '../../utils/format'
import { download } from '../../utils/csv'
import { Loaded } from '../ui'

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

/** Every saved draft and milestone version. Restoring creates a new saved state; nothing is deleted. */
export function VersionsDialog({ workspaceId, readOnly, onRestore, onClose }) {
  const query = useAsync(() => (workspaceId ? workspaceApi.listVersions(workspaceId) : Promise.resolve([])), [workspaceId])
  const [confirm, setConfirm] = useState(null)
  const KIND = { auto: 'Autosave', manual: 'Manual save', submit: 'Submitted', revision: 'Revision requested' }
  return (
    <Modal title="Draft and version history" onClose={onClose} wide>
      <Loaded query={query}>
        {(rows) => rows.length ? (
          <ul className="version-list">
            {rows.map((v) => (
              <li key={v.id}>
                <div className="grow"><b>{KIND[v.kind]}</b> <small>round {v.revision + 1} · v{v.version} · {fmtDateTime(v.createdAt)}</small></div>
                <button className="link-btn" onClick={() => download(`version-${v.version}.json`, JSON.stringify({ data: v.data, progress: v.progress, notes: v.notes }, null, 2), 'application/json')}>Download</button>
                {!readOnly && <button className="link-btn" onClick={() => setConfirm(v)}>Restore</button>}
              </li>
            ))}
          </ul>
        ) : <p className="muted">No versions yet. Versions are saved automatically at least every 5 minutes while you work, and every time you press Save.</p>}
      </Loaded>
      {confirm && (
        <div className="callout">Restore version {confirm.version}? Your current work is kept in the history.
          <div className="inline-actions"><button className="btn" onClick={() => { onRestore(confirm); onClose() }}>Restore</button><button className="btn secondary" onClick={() => setConfirm(null)}>Keep current</button></div></div>
      )}
      <div className="modal-actions"><button className="btn secondary" onClick={onClose}>Close</button></div>
    </Modal>
  )
}

/** Working sessions for a project (server timestamps). */
export function SessionList({ assignmentId, refreshKey }) {
  const query = useAsync(() => workspaceApi.listSegmentsFor(assignmentId), [assignmentId, refreshKey])
  return (
    <Loaded query={query}>
      {(rows) => rows.length ? (
        <ul className="mini-list">
          {rows.map((s) => {
            const end = s.endedAt ? +new Date(s.endedAt) : null
            return <li key={s.id}><span>{fmtDateTime(s.startedAt)}</span><span className="muted small">{end ? hms((end - +new Date(s.startedAt)) / 1000) : 'running'}</span></li>
          })}
        </ul>
      ) : <p className="muted small">No sessions yet.</p>}
    </Loaded>
  )
}

export function SubmitDialog({ cfg, missing, seconds, rate, onSubmit, onClose }) {
  const [note, setNote] = useState('')
  const [link, setLink] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const noteBad = note.trim().length < 20
  const linkBad = link && !/^https?:\/\/\S+$/i.test(link)
  async function go(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await onSubmit(note.trim(), link.trim()) } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (
    <Modal title="Submit your work" onClose={() => !busy && onClose()} wide>
      <form onSubmit={go} noValidate>
        <dl className="kv">
          <dt>Recorded working time</dt><dd>{hms(seconds)} ({hoursLabel(seconds)})</dd>
          <dt>Hourly rate</dt><dd>{money(rate)}/hr</dd>
          <dt>Estimated earnings</dt><dd>{money(earningsFor(seconds, rate))} <small className="muted">(subject to administrator approval of your hours)</small></dd>
        </dl>
        <h3>Submission checklist</h3>
        {missing.length ? <div className="callout bad"><b>Not ready to submit.</b> Still needed:<ul className="bullets">{missing.map((m) => <li key={m}>{m}</li>)}</ul></div> : <div className="callout info">All required deliverables and sections are complete.</div>}
        {cfg.submissionRequirements.length > 0 && <><h3>Submission requirements</h3><ul className="bullets">{cfg.submissionRequirements.map((r) => <li key={r}>{r}</li>)}</ul></>}
        <div className="field"><label htmlFor="sn">Summary of your work</label><textarea id="sn" rows={4} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={noteBad && note ? 'true' : undefined} />
          <small>20–2000 characters. {note.trim().length} so far.</small></div>
        <div className="field"><label htmlFor="sl">Link to extra material (optional)</label><input id="sl" type="url" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />{linkBad && <div className="field-error">Enter a link starting with http:// or https://</div>}</div>
        <label className="check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>I confirm this work is complete. Submitting stops my timer and locks editing until an administrator reviews it.</span></label>
        {err && <div className="callout bad" role="alert">{err}</div>}
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose} disabled={busy}>Keep working</button>
          <button type="submit" className="btn" disabled={busy || missing.length > 0 || noteBad || linkBad || !ok}>{busy ? 'Submitting…' : 'Submit work'}</button></div>
      </form>
    </Modal>
  )
}
