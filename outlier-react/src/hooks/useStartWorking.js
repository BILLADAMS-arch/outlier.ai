import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as assignmentsApi from '../services/assignments'

/**
 * "Start Working": checks sign-in, account approval and onboarding in the app, then asks the server to
 * create or resume the tracked session (the server re-verifies approval, ownership and onboarding), and opens the workspace.
 */
export function useStartWorking() {
  const { session, isApproved } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [busyId, setBusyId] = useState(null)

  const start = useCallback(async (assignment) => {
    if (!session) { navigate('/login'); return }
    if (!isApproved) { toast.error('Your account must be approved before you can work.'); navigate('/dashboard'); return }
    if (!['assigned', 'in_progress'].includes(assignment.status)) { navigate(`/workspace/project/${assignment.id}`); return }
    if (!assignment.onboardedAt) { navigate(`/projects/${assignment.id}/onboarding`); return }
    setBusyId(assignment.id)
    try {
      await assignmentsApi.startWork(assignment.id)
      window.dispatchEvent(new Event('outlier:timer-changed'))
      navigate(`/workspace/project/${assignment.id}`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }, [session, isApproved, navigate, toast])

  return { start, busyId }
}
