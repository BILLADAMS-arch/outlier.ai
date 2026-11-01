import { useState } from 'react'
import FilePanel from '../FilePanel'
import { Icon } from '../../ui'
import { uid } from '../../../utils/sanitize'

export default function AssistantTool({ cfg, ws, ctx }) {
  const a = ws.data.assistant || { checklist: [], updates: [] }
  const [text, setText] = useState('')
  const [update, setUpdate] = useState('')
  const save = (patch) => {
    const next = { ...a, ...patch }
    const done = next.checklist.filter((i) => i.done).length
    ws.set({ assistant: next, sections: { ...ws.data.sections, assistant: next.checklist.length && done === next.checklist.length ? `${done} of ${next.checklist.length} done` : '' } })
  }
  const done = a.checklist.filter((i) => i.done).length
  const pct = a.checklist.length ? Math.round((100 * done) / a.checklist.length) : 0
  return (
    <div className="tool">
      {cfg.tools.includes('checklist') && (
        <section><h3>Task checklist</h3>
          <div className="progress" aria-label="Checklist progress"><span style={{ width: `${pct}%` }} /></div><p className="muted small">{done} of {a.checklist.length} complete ({pct}%)</p>
          <ul className="checklist">
            {a.checklist.map((i) => (
              <li key={i.id} className={i.done ? 'done' : ''}>
                <label><input type="checkbox" disabled={ctx.readOnly} checked={i.done} onChange={(e) => save({ checklist: a.checklist.map((x) => (x.id === i.id ? { ...x, done: e.target.checked } : x)) })} /> <span>{i.text}</span></label>
                {!ctx.readOnly && <button type="button" className="link-btn danger-text" onClick={() => save({ checklist: a.checklist.filter((x) => x.id !== i.id) })} aria-label={`Remove ${i.text}`}><Icon name="fa-trash" /></button>}
              </li>
            ))}
          </ul>
          {!ctx.readOnly && <form className="inline-actions" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { save({ checklist: [...a.checklist, { id: uid(), text: text.trim(), done: false }] }); setText('') } }}>
            <input aria-label="New task" placeholder="Add a task…" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} /><button className="btn secondary" type="submit"><Icon name="fa-plus" /> Add</button></form>}
        </section>
      )}
      {cfg.tools.includes('status') && (
        <section><h3>Status updates</h3>
          {!ctx.readOnly && <form className="inline-actions" onSubmit={(e) => { e.preventDefault(); if (update.trim()) { save({ updates: [{ id: uid(), at: new Date().toISOString(), text: update.trim() }, ...a.updates] }); setUpdate('') } }}>
            <input aria-label="Status update" placeholder="What did you just complete?" maxLength={300} value={update} onChange={(e) => setUpdate(e.target.value)} /><button className="btn secondary" type="submit">Post update</button></form>}
          <ul className="mini-list">{a.updates.map((u) => <li key={u.id}><span>{u.text}</span><span className="muted small">{new Date(u.at).toLocaleString()}</span></li>)}</ul>
          {!a.updates.length && <p className="muted small">No updates yet.</p>}
        </section>
      )}
      {cfg.tools.includes('documents') && <FilePanel ctx={ctx} kind="attachment" title="Documents" />}
      {cfg.tools.includes('notes') && <p className="muted small">Use the Notes tab in the right panel for free-form notes.</p>}
    </div>
  )
}
