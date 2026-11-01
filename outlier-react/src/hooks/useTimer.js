import { useCallback, useEffect, useState } from 'react'
import * as assignments from '../services/assignments'

/**
 * Server-backed work timer. The database owns the clock: each sync returns the tracked seconds
 * as of "now" on the server, and the browser only interpolates between syncs. Refreshing the
 * page, signing out/in, or opening another device always recovers the same value.
 */
export function useTimer(assignmentId) {
  const [snap, setSnap] = useState(null) // { tracked, running, status, at }
  const [now, setNow] = useState(() => performance.now())
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const apply = useCallback((s) => setSnap({ tracked: s.trackedSeconds, running: s.running, status: s.status, at: performance.now() }), [])

  const sync = useCallback(async () => {
    try {
      apply(await assignments.timerState(assignmentId))
      setError(null)
    } catch (e) {
      setError(e)
    }
  }, [assignmentId, apply])

  useEffect(() => {
    sync()
    const id = setInterval(sync, 30000)
    const onVisible = () => document.visibilityState === 'visible' && sync()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sync])

  // While running, tell the server we are still here. If beats stop (tab closed, laptop asleep) the server stops counting.
  const running = !!snap?.running
  useEffect(() => {
    if (!running) return undefined
    const beat = () => assignments.heartbeat(assignmentId).then(apply, () => {})
    const id = setInterval(beat, 60000)
    return () => clearInterval(id)
  }, [running, assignmentId, apply])

  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const run = useCallback(async (fn) => {
    setBusy(true)
    try {
      const s = await fn()
      if (s) apply(s)
      setError(null)
      return s
    } catch (e) {
      setError(e)
      throw e
    } finally {
      setBusy(false)
    }
  }, [apply])

  const seconds = snap ? snap.tracked + (snap.running ? Math.max(0, Math.floor((now - snap.at) / 1000)) : 0) : 0
  return {
    ready: !!snap, seconds, running: !!snap?.running, status: snap?.status, error, busy, sync,
    start: () => run(() => assignments.startWork(assignmentId)),
    pause: () => run(() => assignments.pauseWork(assignmentId)),
    submit: (note, link) => run(() => assignments.submitWork(assignmentId, note, link)),
  }
}
