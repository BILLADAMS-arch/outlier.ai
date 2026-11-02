import { useState } from 'react'
import RefLinks from '../components/RefLinks'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import * as assignmentsApi from '../services/assignments'
import { useToast } from '../context/ToastContext'
import { onboardingContent } from '../utils/onboarding'
import { money } from '../utils/format'
import { EmptyState, Loaded, PageHeader } from '../components/ui'

const Bullets = ({ items, ordered }) => (ordered ? <ol className="step-list">{items.map((i) => <li key={i}>{i}</li>)}</ol> : <ul className="bullets">{items.map((i) => <li key={i}>{i}</li>)}</ul>)

export default function Onboarding() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [read, setRead] = useState(false)
  const [guidelines, setGuidelines] = useState(false)
  const [busy, setBusy] = useState(false)
  const query = useAsync(() => assignmentsApi.get(assignmentId), [assignmentId])

  return (
    <Loaded query={query}>
      {(a) => {
        if (!a) return <EmptyState icon="fa-circle-question" title="Project not found" action={<Link className="btn" to="/projects">My projects</Link>}>This project isn&apos;t assigned to you.</EmptyState>
        // Returning taskers (and projects past the working stage) skip onboarding.
        if (a.onboardedAt || !['assigned', 'in_progress'].includes(a.status)) return <Navigate to={`/workspace/project/${a.id}`} replace />
        const t = a.tasks
        const c = onboardingContent(t)
        async function complete() {
          setBusy(true)
          try {
            await assignmentsApi.ackOnboarding(a.id)
            await assignmentsApi.startWork(a.id)
            window.dispatchEvent(new Event('outlier:timer-changed'))
            toast.success('Onboarding complete. Your working session has started.')
            navigate(`/workspace/project/${a.id}`, { replace: true })
          } catch (e) {
            toast.error(e.message)
            setBusy(false)
          }
        }
        return (
          <>
            <PageHeader title={`Onboarding: ${t.title}`}>Read everything below and confirm before you start working.</PageHeader>
            <div className="panel"><h2>Project overview</h2><p className="lead">{c.overview}</p></div>
            <div className="panel"><h2>Project objectives</h2><Bullets items={c.objectives} /></div>
            <div className="panel"><h2>Detailed instructions</h2><Bullets items={c.instructions} ordered /></div>
            <div className="panel"><h2>Expected deliverables</h2><Bullets items={c.deliverables} /></div>
            <div className="panel"><h2>Required skills</h2><div className="chips">{c.skills.map((s) => <span className="chip" key={s}>{s}</span>)}</div></div>
            <div className="panel">
              <h2>Payment</h2>
              <dl className="kv">
                <dt>Hourly payment rate</dt><dd>{money(a.agreedRate)}/hr (USD)</dd>
                <dt>Estimated working hours</dt><dd>{t.estimatedHours} hours</dd>
                <dt>Estimated total</dt><dd>{money(a.agreedRate * t.estimatedHours)}</dd>
              </dl>
              <p className="muted">You are paid for approved tracked working time: approved hours × your hourly rate.</p>
            </div>
            {t.referenceLinks?.length > 0 && <div className="panel"><h2>References and tools</h2><RefLinks links={t.referenceLinks} /></div>}
            <div className="panel"><h2>Important project guidelines</h2><Bullets items={c.guidelines} /></div>
            <div className="panel">
              <label className="check"><input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} /><span>I have read and understood the project overview, objectives, instructions and expected deliverables.</span></label>
              <label className="check"><input type="checkbox" checked={guidelines} onChange={(e) => setGuidelines(e.target.checked)} /><span>I agree to follow the project guidelines and the payment terms above.</span></label>
              <button className="btn big" disabled={!read || !guidelines || busy} onClick={complete}>{busy ? 'Saving…' : 'Complete onboarding and start working'}</button>
            </div>
          </>
        )
      }}
    </Loaded>
  )
}
