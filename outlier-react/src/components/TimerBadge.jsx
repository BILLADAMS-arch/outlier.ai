import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as assignments from '../services/assignments'
import { hms } from '../utils/format'

/** Shows a live clock in the top bar whenever a work timer is running, on every page. */
export default function TimerBadge({ userId }) {
  const [snap, setSnap] = useState(null)
  const [now, setNow] = useState(() => performance.now())

  useEffect(() => {
    let off = false
    const load = () => assignments.activeTimer().then((t) => !off && setSnap(t ? { ...t, at: performance.now() } : null), () => {})
    load()
    const id = setInterval(load, 30000)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('outlier:timer-changed', load)
    return () => {
      off = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('outlier:timer-changed', load)
    }
  }, [userId])

  useEffect(() => {
    if (!snap) return undefined
    const id = setInterval(() => setNow(performance.now()), 1000)
    return () => clearInterval(id)
  }, [snap])

  if (!snap) return null
  const seconds = snap.trackedSeconds + Math.max(0, Math.floor((now - snap.at) / 1000))
  return (
    <Link to={`/projects/${snap.assignmentId}/work`} className="timer-badge" title={snap.taskTitle}>
      <span className="dot-live" /> {hms(seconds)}
    </Link>
  )
}
