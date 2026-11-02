import { useState } from 'react'
import BriefView from '../components/brief/BriefView'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import * as assignmentsApi from '../services/assignments'
import { useToast } from '../context/ToastContext'
import { money } from '../utils/format'
import { EmptyState, Loaded, PageHeader } from '../components/ui'

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
            <div className="callout info">This is the full project briefing. It stays available in the workspace while you work.</div>
            <BriefView task={t} />
            <div className="panel">
              <h2>Payment</h2>
              <dl className="kv">
                <dt>Hourly payment rate</dt><dd>{money(a.agreedRate)}/hr (USD)</dd>
                <dt>Estimated working hours</dt><dd>{t.estimatedHours} hours</dd>
                <dt>Estimated total</dt><dd>{money(a.agreedRate * t.estimatedHours)}</dd>
              </dl>
              <p className="muted">You are paid for approved tracked working time: approved hours × your hourly rate.</p>
            </div>
            <div className="panel">
              <label className="check"><input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} /><span>I have reviewed the full project briefing: the background, scope, step-by-step instructions, input materials, deliverables, acceptance criteria and submission requirements.</span></label>
              <label className="check"><input type="checkbox" checked={guidelines} onChange={(e) => setGuidelines(e.target.checked)} /><span>I agree to follow the project guidelines and the payment terms above.</span></label>
              <button className="btn big" disabled={!read || !guidelines || busy} onClick={complete}>{busy ? 'Saving…' : 'Complete onboarding and start working'}</button>
            </div>
          </>
        )
      }}
    </Loaded>
  )
}
