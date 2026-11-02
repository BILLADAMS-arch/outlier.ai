import { useState } from 'react'
import BriefView from './BriefView'
import LIcon from '../LIcon'

/** Full-screen project brief. With `onAcknowledge` it blocks work until the tasker confirms they reviewed it. */
export default function BriefDialog({ task, onClose, onAcknowledge }) {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const must = !!onAcknowledge
  async function confirm() {
    setBusy(true)
    try { await onAcknowledge() } finally { setBusy(false) }
  }
  return (
    <div className="bv-modal" role="dialog" aria-modal="true" aria-label={`Project brief: ${task.title}`}>
      <div className="bv-modal-box">
        <header className="bv-modal-head">
          <div><strong>{must ? 'Review the project briefing' : 'Project brief'}</strong><p className="muted small">{task.title}</p></div>
          {!must && <button type="button" className="sh-icon" onClick={onClose} aria-label="Close brief"><LIcon name="x" size={18} /></button>}
        </header>
        <div className="bv-modal-body">
          {must && <div className="callout info">Before you continue working, read the briefing below: what the project is, the scope, the instructions, the input materials, the deliverables and the acceptance criteria.</div>}
          <BriefView task={task} />
        </div>
        {must && (
          <footer className="bv-modal-foot">
            <label className="check"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /><span>I have reviewed the full project briefing, including the scope, input materials, deliverables and acceptance criteria.</span></label>
            <button type="button" className="btn big" disabled={!checked || busy} onClick={confirm}>{busy ? 'Saving…' : 'Acknowledge and continue'}</button>
          </footer>
        )}
      </div>
    </div>
  )
}
