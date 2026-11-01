import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { useTimer } from '../hooks/useTimer'
import { useToast } from '../context/ToastContext'
import * as assignmentsApi from '../services/assignments'
import { onboardingContent } from '../utils/onboarding'
import { earningsFor, fmtDateTime, hms, hoursLabel, money } from '../utils/format'
import { EmptyState, Loaded, StatusPill } from '../components/ui'
import FormDialog from '../components/FormDialog'

const notifyTimerChanged = () => window.dispatchEvent(new Event('outlier:timer-changed'))

function Room({ assignment: a, reload }) {
  const toast = useToast()
  const timer = useTimer(a.id)
  const [submitting, setSubmitting] = useState(false)
  const t = a.tasks
  const c = onboardingContent(t)
  const status = timer.status || a.status
  const open = status === 'assigned' || status === 'in_progress'
  const rate = Number(a.agreedRate)

  async function act(fn, success) {
    try {
      await fn()
      if (success) toast.success(success)
      notifyTimerChanged()
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <>
      <div className={`timer-bar${timer.running ? ' is-running' : ''}`} role="timer" aria-label="Working timer">
        <div>
          <span className="timer-label">Working time</span>
          <div className="timer-clock" aria-live="off">{timer.ready ? hms(timer.seconds) : '--:--:--'}</div>
        </div>
        <span className={`timer-state${timer.running ? ' running' : ''}`}>{timer.running ? 'Running' : open ? 'Paused' : status.replace('_', ' ')}</span>
        {open && (
          <div className="timer-actions">
            {timer.running
              ? <button className="btn warn" disabled={timer.busy} onClick={() => act(timer.pause, 'Timer paused.')}>Pause</button>
              : <button className="btn light" disabled={timer.busy || !timer.ready} onClick={() => act(timer.start)}>{timer.seconds > 0 ? 'Resume' : 'Start Working'}</button>}
            <button className="btn" disabled={timer.busy || timer.seconds < 60 || status !== 'in_progress'} title={timer.seconds < 60 ? 'Track at least one minute first' : ''} onClick={() => setSubmitting(true)}>Submit work</button>
          </div>
        )}
      </div>
      {timer.error && <div className="callout bad" role="alert">{timer.error.message}</div>}

      <div className="page-header"><h1>{t.title}</h1><p>Project workspace · <StatusPill value={status} /></p></div>
      <section className="metrics">
        <div className="metric"><span>Current working time</span><strong>{hms(timer.seconds)}</strong></div>
        <div className="metric"><span>Hourly rate</span><strong>{money(rate)}/hr</strong></div>
        <div className="metric"><span>Estimated earnings</span><strong>{money(earningsFor(timer.seconds, rate))}</strong></div>
        <div className="metric"><span>Approved earnings</span><strong>{a.status === 'completed' ? money(earningsFor(a.approvedSeconds, rate)) : '$0.00'}</strong></div>
        <div className="metric"><span>Total project working hours</span><strong>{hoursLabel(timer.seconds)}</strong></div>
      </section>

      {a.reviewerNote && a.status !== 'completed' && <div className="callout"><b>Admin note:</b> {a.reviewerNote}</div>}
      {status === 'submitted' && <div className="callout info">Submitted {fmtDateTime(a.submittedAt)}. An administrator is reviewing your work and tracked time. The timer is stopped.</div>}
      {a.status === 'completed' && <div className="callout info">Completed {fmtDateTime(a.completedAt)}. Approved time: {hoursLabel(a.approvedSeconds)} × {money(rate)}/hr = <b>{money(earningsFor(a.approvedSeconds, rate))}</b>. {a.reviewerNote && `Note: ${a.reviewerNote}`}</div>}
      {status === 'cancelled' && <div className="callout bad">This project was cancelled by an administrator.</div>}
      {a.submissionNote && <div className="panel"><h2>Your submission</h2><p>{a.submissionNote}</p>{a.submissionLink && <p><a href={a.submissionLink} target="_blank" rel="noopener noreferrer">Open deliverables</a></p>}</div>}

      <div className="panel"><h2>Instructions</h2><ol className="step-list">{c.instructions.map((i) => <li key={i}>{i}</li>)}</ol></div>
      <div className="panel"><h2>Deliverables</h2><ul className="bullets">{c.deliverables.map((i) => <li key={i}>{i}</li>)}</ul></div>
      <div className="panel"><h2>Guidelines</h2><ul className="bullets">{c.guidelines.map((i) => <li key={i}>{i}</li>)}</ul></div>

      {submitting && (
        <FormDialog title="Submit your work" intro={`Submitting stops the timer. Tracked time so far: ${hms(timer.seconds)}. An administrator will review it before any payment.`} confirmLabel="Submit for review" onClose={() => setSubmitting(false)}
          fields={[
            { name: 'note', label: 'What did you complete?', type: 'textarea', required: true, maxLength: 2000, hint: '20–2000 characters.' },
            { name: 'link', label: 'Link to deliverables (optional)', type: 'url', placeholder: 'https://…' },
          ]}
          validate={(d) => ({
            note: d.note.length < 20 ? `Please write at least 20 characters (${d.note.length} so far).` : '',
            link: d.link && !/^https?:\/\/\S+$/i.test(d.link) ? 'Enter a link starting with http:// or https://.' : '',
          })}
          onSubmit={async (d) => { await timer.submit(d.note, d.link); toast.success('Work submitted for review.'); notifyTimerChanged(); reload() }} />
      )}
    </>
  )
}

export default function Workspace() {
  const { assignmentId } = useParams()
  const query = useAsync(() => assignmentsApi.get(assignmentId), [assignmentId], { refreshOnFocus: true })
  return (
    <Loaded query={query}>
      {(a) => {
        if (!a) return <EmptyState icon="fa-circle-question" title="Project not found" action={<Link className="btn" to="/projects">My projects</Link>}>This project isn&apos;t assigned to you.</EmptyState>
        if (!a.onboardedAt && ['assigned', 'in_progress'].includes(a.status)) return <Navigate to={`/projects/${a.id}/onboarding`} replace />
        return <Room assignment={a} reload={query.reload} />
      }}
    </Loaded>
  )
}
