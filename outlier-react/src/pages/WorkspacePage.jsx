import { useEffect, useMemo, useRef, useState } from 'react'
import RefLinks from '../components/RefLinks'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { useIdle } from '../hooks/useIdle'
import { useTimer } from '../hooks/useTimer'
import { useWorkspaceDoc } from '../hooks/useWorkspaceDoc'
import * as assignmentsApi from '../services/assignments'
import * as tasksApi from '../services/tasks'
import * as workspaceApi from '../services/workspace'
import * as earningsApi from '../services/earnings'
import { configFor, missingItems, progressPercent, WORKSPACE_TYPES } from '../utils/workspaceTypes'
import { onboardingContent } from '../utils/onboarding'
import { earningsFor, fmtDateTime, hms, hoursLabel, money } from '../utils/format'
import { EmptyState, Icon, Spinner, StatusPill } from '../components/ui'
import ToolRenderer from '../components/workspace/tools'
import FilePanel from '../components/workspace/FilePanel'
import { SessionList, SubmitDialog, VersionsDialog } from '../components/workspace/Dialogs'

const SAVE_LABEL = { saved: 'Saved', dirty: 'Unsaved changes', saving: 'Saving…', error: 'Save failed — Retry', conflict: 'Out of date — Reload' }

function SaveStatus({ ws, readOnly }) {
  const { status, at } = ws.save
  if (readOnly) return <span className="save-state">Read only</span>
  const bad = status === 'error' || status === 'conflict'
  return (
    <button type="button" className={`save-state ${status}`} onClick={() => (status === 'conflict' ? window.location.reload() : bad ? ws.retry() : ws.saveNow())} title={ws.save.error?.message || (at ? `Last saved ${fmtDateTime(at)}` : '')} aria-live="polite">
      <Icon name={status === 'saving' ? 'fa-spinner fa-spin-pulse' : status === 'saved' ? 'fa-cloud-check' : bad ? 'fa-triangle-exclamation' : 'fa-pen'} /> {SAVE_LABEL[status]}
    </button>
  )
}

function Section({ title, icon, children, defaultOpen = true }) {
  return <details className="side-section" open={defaultOpen}><summary><Icon name={icon} /> {title}</summary><div>{children}</div></details>
}

function WorkspaceView({ a, task, category, initialWs, initialFiles, resources, settings, reloadAll }) {
  const { profile, user } = useAuth()
  const toast = useToast()
  const cfg = useMemo(() => configFor({ ...task, categoryId: task.categoryId }), [task])
  const mine = a.userId === user.id
  const editable = mine && ['assigned', 'in_progress'].includes(a.status)
  const ws = useWorkspaceDoc(a.id, initialWs, !editable)
  const timer = useTimer(a.id)
  const files = useAsync(() => workspaceApi.listFiles(a.id), [a.id])
  const [left, setLeft] = useState(() => window.innerWidth > 1100)
  const [right, setRight] = useState(() => window.innerWidth > 1300)
  const [tab, setTab] = useState('progress')
  const [dialog, setDialog] = useState(null)
  const [sessionsKey, setSessionsKey] = useState(0)
  const idleMinutes = Number(settings.inactivity_pause_minutes || 10)
  const idle = useIdle(idleMinutes, timer.running && editable)
  const idleHandled = useRef(false)

  // Inactivity: the server also stops counting if heartbeats stop; this pauses cleanly and tells the tasker.
  useEffect(() => {
    if (idle && timer.running && !idleHandled.current) {
      idleHandled.current = true
      timer.pause().then(() => { toast.error(`Timer paused after ${idleMinutes} minutes without activity.`); window.dispatchEvent(new Event('outlier:timer-changed')); setSessionsKey((k) => k + 1) }, () => {})
    }
    if (!idle) idleHandled.current = false
  }, [idle, timer, idleMinutes, toast])

  const fileList = files.data || initialFiles
  const ctx = useMemo(() => ({ assignmentId: a.id, readOnly: !editable, files: fileList, reloadFiles: files.reload, resources, showHistory: () => setDialog('history') }), [a.id, editable, fileList, files.reload, resources])
  const missing = useMemo(() => missingItems(cfg, ws.data, ws.progress, fileList), [cfg, ws.data, ws.progress, fileList])
  const pct = progressPercent(cfg, ws.progress)
  const rate = Number(a.agreedRate)
  const guide = onboardingContent(task)
  const status = timer.status || a.status
  const T = WORKSPACE_TYPES[cfg.type]
  const docResources = resources.filter((r) => r.kind !== 'audio')

  const act = async (fn, msg) => { try { await fn(); if (msg) toast.success(msg); window.dispatchEvent(new Event('outlier:timer-changed')); setSessionsKey((k) => k + 1); reloadAll() } catch (e) { toast.error(e.message) } }
  const submit = async (note, link) => {
    const saved = await ws.saveNow()
    if (!saved) throw new Error('Your latest changes could not be saved, so the work was not submitted. Fix the save problem and try again.')
    await timer.submit(note, link)
    window.dispatchEvent(new Event('outlier:timer-changed'))
    toast.success('Work submitted. An administrator will review it.')
    setDialog(null)
    reloadAll()
  }
  const openResource = async (r) => { try { window.open(r.url || (await workspaceApi.signedUrl('project-resources', r.path)), '_blank', 'noopener') } catch (e) { toast.error(e.message) } }

  return (
    <div className="ws-root">
      <header className="ws-header">
        <Link className="ws-back" to="/projects" aria-label="Back to projects"><Icon name="fa-arrow-left" /></Link>
        <div className="ws-title">
          <h1>{task.title}</h1>
          <p><Icon name={T.icon} /> {category?.name || T.label} · {profile.displayName} · <StatusPill value={status} /></p>
        </div>
        <div className="ws-metrics">
          <div className={`ws-timer${timer.running ? ' running' : ''}`} role="timer" aria-label="Working timer"><span className="timer-label">Working time</span><b>{timer.ready ? hms(timer.seconds) : '--:--:--'}</b></div>
          <div><span className="timer-label">Rate</span><b>{money(rate)}/hr</b></div>
          <div><span className="timer-label">Estimated earnings</span><b>{money(earningsFor(timer.seconds, rate))}</b></div>
        </div>
        <div className="ws-actions">
          <SaveStatus ws={ws} readOnly={!editable} />
          {editable && (timer.running
            ? <button className="btn warn" disabled={timer.busy} onClick={() => act(timer.pause, 'Timer paused.')}>Pause</button>
            : <button className="btn light" disabled={timer.busy || !timer.ready} onClick={() => act(timer.start)}>{timer.seconds > 0 ? 'Resume' : 'Start'}</button>)}
          {editable && <button className="btn" disabled={timer.busy || timer.seconds < 60 || status !== 'in_progress'} title={timer.seconds < 60 ? 'Track at least one minute first' : ''} onClick={() => setDialog('submit')}>Submit work</button>}
        </div>
      </header>

      {timer.error && <div className="callout bad ws-banner" role="alert">{timer.error.message}</div>}
      {editable && !timer.running && timer.ready && <div className="callout ws-banner">The timer is paused, so time is not being counted. Press <b>Resume</b> to keep tracking. Your edits are still saved.</div>}
      {ws.save.status === 'conflict' && <div className="callout bad ws-banner" role="alert">This workspace was changed in another tab or session. <button className="link-btn" onClick={() => window.location.reload()}>Reload to continue</button> (your unsaved changes in this tab will be lost).</div>}
      {!mine && <div className="callout info ws-banner">You are viewing this workspace as an administrator (read only).</div>}
      {mine && !editable && <div className="callout info ws-banner">This work is <b>{status}</b> and is locked. {status === 'submitted' ? 'It can be edited again only if an administrator requests revisions.' : ''}</div>}
      {a.reviewerNote && a.status === 'in_progress' && <div className="callout ws-banner"><b>Revision requested:</b> {a.reviewerNote}</div>}

      <div className={`ws-body${left ? '' : ' no-left'}${right ? '' : ' no-right'}`}>
        <aside className="ws-left" aria-label="Project information">
          <button className="ws-collapse" onClick={() => setLeft(false)} aria-label="Collapse project information"><Icon name="fa-angles-left" /></button>
          <Section title="Instructions" icon="fa-book"><ol className="step-list">{guide.instructions.map((i) => <li key={i}>{i}</li>)}</ol></Section>
          <Section title="Objectives" icon="fa-bullseye"><ul className="bullets">{guide.objectives.map((i) => <li key={i}>{i}</li>)}</ul></Section>
          <Section title="Requirements" icon="fa-clipboard-check"><ul className="bullets">{[...task.qualifications, ...cfg.submissionRequirements].map((i) => <li key={i}>{i}</li>)}</ul></Section>
          <Section title="Deliverables checklist" icon="fa-list-check">
            <ul className="checklist ro">
              {(cfg.requiredDeliverables.length ? cfg.requiredDeliverables : task.deliverables.map((d) => ({ id: d, label: d, none: true }))).map((d) => {
                const miss = missing.some((m) => m.startsWith(d.label))
                return <li key={d.id} className={!d.none && !miss ? 'done' : ''}><Icon name={d.none ? 'fa-circle' : miss ? 'fa-circle' : 'fa-circle-check'} /> {d.label}</li>
              })}
            </ul>
          </Section>
          <Section title="Supporting documents" icon="fa-folder-open" defaultOpen={docResources.length > 0}>
            {docResources.length ? <ul className="mini-list">{docResources.map((r) => <li key={r.id}><span>{r.label}</span><button className="link-btn" onClick={() => openResource(r)}>Open</button></li>)}</ul> : <p className="muted small">No supporting documents.</p>}
          </Section>
          {task.referenceLinks?.length > 0 && <Section title="References and tools" icon="fa-link" defaultOpen={false}><RefLinks links={task.referenceLinks} compact /></Section>}
          <Section title="Guidelines" icon="fa-shield-halved" defaultOpen={false}><ul className="bullets">{guide.guidelines.map((i) => <li key={i}>{i}</li>)}</ul></Section>
        </aside>

        <main className="ws-center" id="ws-main">
          {!left && <button className="ws-reopen left" onClick={() => setLeft(true)} aria-label="Show project information"><Icon name="fa-angles-right" /></button>}
          {!right && <button className="ws-reopen right" onClick={() => setRight(true)} aria-label="Show progress panel"><Icon name="fa-angles-left" /></button>}
          <div className="ws-tool-title"><Icon name={T.icon} /> {T.label}</div>
          <ToolRenderer cfg={cfg} ws={ws} ctx={ctx} />
        </main>

        <aside className="ws-right" aria-label="Progress and resources">
          <button className="ws-collapse" onClick={() => setRight(false)} aria-label="Collapse progress panel"><Icon name="fa-angles-right" /></button>
          <div className="tool-tabs" role="tablist">{[['progress', 'Progress'], ['files', 'Files'], ['history', 'History'], ['notes', 'Notes'], ['submit', 'Submission']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
          {tab === 'progress' && (
            <div>
              {pct != null && <><div className="progress" aria-label="Project completion"><span style={{ width: `${pct}%` }} /></div><p className="muted small">{pct}% complete</p></>}
              <h3>Subtasks</h3>
              {cfg.subtasks.length ? (
                <ul className="checklist">
                  {cfg.subtasks.map((s) => <li key={s.id} className={ws.progress[s.id] ? 'done' : ''}><label><input type="checkbox" disabled={!editable} checked={!!ws.progress[s.id]} onChange={(e) => ws.setProgress(s.id, e.target.checked)} /> <span>{s.title}{s.required && <em className="req"> required</em>}</span></label></li>)}
                </ul>
              ) : <p className="muted small">This project has no subtasks. Use the checklist tools to track your work.</p>}
              <h3>Remaining</h3>
              {missing.length ? <ul className="bullets small">{missing.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="muted small">Everything required is complete.</p>}
            </div>
          )}
          {tab === 'files' && <div><FilePanel ctx={{ ...ctx }} kind="attachment" title="Attachments" /><FilePanel ctx={ctx} kind="deliverable" title="Deliverables" /></div>}
          {tab === 'history' && (
            <div>
              <h3>Work sessions</h3><SessionList assignmentId={a.id} refreshKey={sessionsKey + (timer.running ? 1 : 0)} />
              <h3>Drafts</h3><button className="btn secondary" onClick={() => setDialog('history')}><Icon name="fa-clock-rotate-left" /> Open version history</button>
              <p className="muted small">Version {initialWs.revision + 1 > 1 ? `round ${initialWs.revision + 1}` : 'round 1'}. Earlier submissions are preserved.</p>
            </div>
          )}
          {tab === 'notes' && <textarea className="big-text" readOnly={!editable} aria-label="Project notes" placeholder="Private notes for this project…" value={ws.notes} onChange={(e) => ws.setNotes(e.target.value)} />}
          {tab === 'submit' && (
            <div>
              <dl className="kv one">
                <dt>Tracked time</dt><dd>{hoursLabel(timer.seconds)}</dd>
                <dt>Submitted time</dt><dd>{a.submittedSeconds == null ? '—' : hoursLabel(a.submittedSeconds)}</dd>
                <dt>Approved payable time</dt><dd>{a.approvedSeconds == null ? 'Not yet approved' : hoursLabel(a.approvedSeconds)}</dd>
                <dt>Approved earnings</dt><dd>{a.status === 'completed' ? money(earningsFor(a.approvedSeconds, rate)) : '$0.00'}</dd>
              </dl>
              <h3>Submission requirements</h3>
              <ul className="bullets small">{[...cfg.requiredDeliverables.map((d) => d.label), ...cfg.submissionRequirements].map((r) => <li key={r}>{r}</li>)}</ul>
              {editable && <button className="btn big" disabled={timer.seconds < 60 || status !== 'in_progress'} onClick={() => setDialog('submit')}>Review and submit</button>}
            </div>
          )}
        </aside>
      </div>

      {dialog === 'submit' && <SubmitDialog cfg={cfg} missing={missing} seconds={timer.seconds} rate={rate} onSubmit={submit} onClose={() => setDialog(null)} />}
      {dialog === 'history' && <VersionsDialog workspaceId={initialWs.id || ''} readOnly={!editable} onClose={() => setDialog(null)} onRestore={(v) => { ws.replaceAll(v); toast.success(`Version ${v.version} restored.`) }} />}
    </div>
  )
}

export default function WorkspacePage() {
  const { assignmentId } = useParams()
  const { user } = useAuth()
  const query = useAsync(async () => {
    const a = await assignmentsApi.get(assignmentId)
    if (!a) return { a: null }
    const [ws, files, resources, categories, settings] = await Promise.all([workspaceApi.getWorkspace(assignmentId), workspaceApi.listFiles(assignmentId), workspaceApi.listResources(a.taskId), tasksApi.listCategories(), earningsApi.listSettings()])
    return { a, ws, files, resources, categories, settings: Object.fromEntries(settings.map((s) => [s.key, s.value])) }
  }, [assignmentId, user.id])

  if (query.loading) return <div className="center-screen"><Spinner /></div>
  if (query.error) return <div className="center-screen"><EmptyState icon="fa-triangle-exclamation" title="Could not open the workspace" action={<button className="btn" onClick={query.reload}>Try again</button>}>{query.error.message}</EmptyState></div>
  const { a, ws: savedWs, files, resources, categories, settings } = query.data
  const ws = savedWs || { id: null, data: {}, progress: {}, notes: '', version: 0, revision: 0 }
  if (!a) return <div className="center-screen"><EmptyState icon="fa-lock" title="Workspace not found" action={<Link className="btn" to="/projects">My projects</Link>}>This project isn&apos;t assigned to you.</EmptyState></div>
  if (a.userId === user.id && !a.onboardedAt && ['assigned', 'in_progress'].includes(a.status)) return <Navigate to={`/projects/${a.id}/onboarding`} replace />
  return <WorkspaceView key={`${a.id}-${ws?.revision}`} a={a} task={a.tasks} category={categories.find((c) => c.id === a.tasks.categoryId)} initialWs={ws} initialFiles={files} resources={resources} settings={settings} reloadAll={query.reload} />
}
