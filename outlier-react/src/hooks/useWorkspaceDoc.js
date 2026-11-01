import { useCallback, useEffect, useRef, useState } from 'react'
import * as workspaceApi from '../services/workspace'

const DEBOUNCE_MS = 1500

/**
 * The saved working copy of a project. Every change is written to the database (debounced autosave),
 * with an explicit save state: saved | dirty | saving | error | conflict. Work is never discarded:
 * on a failed save the changes stay in memory and the user can retry; closing the tab while unsaved asks first.
 */
export function useWorkspaceDoc(assignmentId, initial, locked) {
  const [doc, setDoc] = useState({ data: initial.data || {}, progress: initial.progress || {}, notes: initial.notes || '' })
  const [save, setSave] = useState({ status: 'saved', error: null, at: initial.updatedAt })
  const latest = useRef(doc)
  const version = useRef(initial.version)
  const changes = useRef(0)       // counts edits, so a save can tell whether newer edits arrived while it was in flight
  const saved = useRef(0)
  const timer = useRef(null)
  const inflight = useRef(false)

  const flush = useCallback(async (kind = 'auto') => {
    clearTimeout(timer.current)
    if (inflight.current) { await new Promise((r) => { timer.current = setTimeout(r, 400) }); return flush(kind) }
    if (changes.current === saved.current && kind === 'auto') return true
    inflight.current = true
    const mark = changes.current
    setSave((s) => ({ ...s, status: 'saving', error: null }))
    try {
      const res = await workspaceApi.saveWorkspace(assignmentId, latest.current, version.current, kind)
      version.current = res.version
      saved.current = mark
      setSave({ status: changes.current === mark ? 'saved' : 'dirty', error: null, at: res.savedAt })
      if (changes.current !== mark) timer.current = setTimeout(() => flush('auto'), DEBOUNCE_MS)
      return true
    } catch (e) {
      setSave((s) => ({ ...s, status: /^STALE/.test(e.message) ? 'conflict' : 'error', error: e }))
      return false
    } finally {
      inflight.current = false
    }
  }, [assignmentId])

  const touch = useCallback((next) => {
    if (locked) return
    latest.current = next
    setDoc(next)
    changes.current += 1
    setSave((s) => (s.status === 'conflict' ? s : { ...s, status: 'dirty' }))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => flush('auto'), DEBOUNCE_MS)
  }, [locked, flush])

  const set = useCallback((patch) => touch({ ...latest.current, data: { ...latest.current.data, ...patch } }), [touch])
  const setProgress = useCallback((id, done) => touch({ ...latest.current, progress: { ...latest.current.progress, [id]: done } }), [touch])
  const setNotes = useCallback((notes) => touch({ ...latest.current, notes }), [touch])
  const replaceAll = useCallback((next) => touch({ data: next.data || {}, progress: next.progress || {}, notes: next.notes || '' }), [touch])

  // Warn before leaving with unsaved work, and flush when the tab is hidden or the page is left.
  const dirty = save.status === 'dirty' || save.status === 'saving' || save.status === 'error'
  useEffect(() => {
    if (!dirty) return undefined
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && changes.current !== saved.current && flush('auto')
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      clearTimeout(timer.current)
      if (changes.current !== saved.current) flush('auto') // leaving the page inside the app: save what is pending
    }
  }, [flush])

  return { ...doc, save, set, setProgress, setNotes, replaceAll, saveNow: () => flush('manual'), retry: () => flush('auto'), locked }
}
