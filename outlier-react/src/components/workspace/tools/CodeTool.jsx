import { lazy, Suspense, useState } from 'react'
import FilePanel from '../FilePanel'
import FormDialog from '../../FormDialog'
import { Icon, Spinner } from '../../ui'
import { download } from '../../../utils/csv'
import { uid } from '../../../utils/sanitize'

const Editor = lazy(() => import('./CodeEditor'))
const LANGS = { js: 'javascript', jsx: 'javascript', ts: 'javascript', tsx: 'javascript', py: 'python', html: 'html', css: 'css', json: 'json', sql: 'sql', md: 'text', txt: 'text' }
const langOf = (name) => LANGS[name.split('.').pop().toLowerCase()] || 'text'

export default function CodeTool({ cfg, ws, ctx }) {
  const code = ws.data.code || { files: [{ id: 'f1', name: 'main.py', content: '' }], snippets: [], activeId: 'f1' }
  const active = code.files.find((f) => f.id === code.activeId) || code.files[0]
  const [dialog, setDialog] = useState(null)
  const save = (patch) => {
    const next = { ...code, ...patch }
    const all = next.files.map((f) => f.content).join('\n').trim()
    ws.set({ code: next, sections: { ...ws.data.sections, code: all } })
  }
  const edit = (id, patch) => save({ files: code.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })

  return (
    <div className="tool">
      <div className="callout info">Code is written and saved here, but it is <b>not executed</b> on our servers. Test it in your own environment and upload the results if the project asks for them.</div>
      <div className="tool-bar">
        <div className="file-tabs" role="tablist">
          {code.files.map((f) => (
            <span key={f.id} className={f.id === active.id ? 'active' : ''}>
              <button role="tab" aria-selected={f.id === active.id} onClick={() => save({ activeId: f.id })}>{f.name}</button>
              {!ctx.readOnly && code.files.length > 1 && <button className="x" aria-label={`Close ${f.name}`} onClick={() => save({ files: code.files.filter((x) => x.id !== f.id), activeId: code.files.find((x) => x.id !== f.id).id })}>×</button>}
            </span>
          ))}
        </div>
        {!ctx.readOnly && <button type="button" className="btn secondary" onClick={() => setDialog('new')}><Icon name="fa-plus" /> New file</button>}
        {!ctx.readOnly && <button type="button" className="btn secondary" onClick={() => setDialog('rename')}>Rename</button>}
        <button type="button" className="btn secondary" onClick={() => download(active.name, active.content)}><Icon name="fa-download" /> Download file</button>
      </div>
      <Suspense fallback={<Spinner />}>
        <Editor key={active.id} value={active.content} lang={langOf(active.name)} readOnly={ctx.readOnly} onChange={(v) => edit(active.id, { content: v })} />
      </Suspense>
      {cfg.tools.includes('snippets') && (
        <div className="snippets">
          <h3>Snippets</h3>
          {code.snippets.map((s) => (
            <div className="row-fields" key={s.id}>
              <input readOnly={ctx.readOnly} aria-label="Snippet title" value={s.title} onChange={(e) => save({ snippets: code.snippets.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)) })} />
              <textarea readOnly={ctx.readOnly} rows={2} aria-label="Snippet" className="mono" value={s.content} onChange={(e) => save({ snippets: code.snippets.map((x) => (x.id === s.id ? { ...x, content: e.target.value } : x)) })} />
              {!ctx.readOnly && <button type="button" className="link-btn" onClick={() => edit(active.id, { content: `${active.content}${active.content ? '\n' : ''}${s.content}` })}>Insert</button>}
              {!ctx.readOnly && <button type="button" className="link-btn danger-text" onClick={() => save({ snippets: code.snippets.filter((x) => x.id !== s.id) })} aria-label="Remove snippet"><Icon name="fa-trash" /></button>}
            </div>
          ))}
          {!ctx.readOnly && <button type="button" className="btn secondary" onClick={() => save({ snippets: [...code.snippets, { id: uid(), title: 'Snippet', content: '' }] })}><Icon name="fa-plus" /> Add snippet</button>}
        </div>
      )}
      {cfg.tools.includes('attachments') && <FilePanel ctx={ctx} kind="deliverable" slot="code" title="Deliverable uploads (archives, builds, screenshots)" />}
      {dialog === 'new' && <FormDialog title="New file" confirmLabel="Create" onClose={() => setDialog(null)} fields={[{ name: 'name', label: 'File name', required: true, placeholder: 'utils.py', maxLength: 80 }]}
        validate={(d) => ({ name: !/^[\w.\- /]+$/.test(d.name) ? 'Use letters, numbers, dots, dashes and slashes.' : code.files.some((f) => f.name === d.name) ? 'A file with this name exists.' : '' })}
        onSubmit={(d) => { const id = uid(); save({ files: [...code.files, { id, name: d.name, content: '' }], activeId: id }) }} />}
      {dialog === 'rename' && <FormDialog title="Rename file" confirmLabel="Rename" onClose={() => setDialog(null)} initial={{ name: active.name }} fields={[{ name: 'name', label: 'File name', required: true, maxLength: 80 }]}
        validate={(d) => ({ name: !/^[\w.\- /]+$/.test(d.name) ? 'Use letters, numbers, dots, dashes and slashes.' : '' })} onSubmit={(d) => edit(active.id, { name: d.name })} />}
    </div>
  )
}
