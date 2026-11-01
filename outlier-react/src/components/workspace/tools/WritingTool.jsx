import { useEffect, useMemo, useRef, useState } from 'react'
import FormDialog from '../../FormDialog'
import FilePanel from '../FilePanel'
import { Icon } from '../../ui'
import { download } from '../../../utils/csv'
import { htmlToText, sanitizeHtml, wordCount } from '../../../utils/sanitize'

const BTN = [
  ['bold', 'fa-bold', 'Bold'], ['italic', 'fa-italic', 'Italic'], ['underline', 'fa-underline', 'Underline'],
  ['insertUnorderedList', 'fa-list-ul', 'Bulleted list'], ['insertOrderedList', 'fa-list-ol', 'Numbered list'],
  ['formatBlock:H2', 'fa-heading', 'Heading'], ['formatBlock:BLOCKQUOTE', 'fa-quote-right', 'Quote'], ['undo', 'fa-rotate-left', 'Undo'], ['redo', 'fa-rotate-right', 'Redo'], ['removeFormat', 'fa-eraser', 'Clear formatting'],
]

export default function WritingTool({ cfg, ws, ctx }) {
  const ref = useRef(null)
  const [linking, setLinking] = useState(false)
  const html = ws.data.doc || ''
  const text = useMemo(() => htmlToText(html), [html])
  const counts = { words: wordCount(text), chars: text.length }

  // Load the saved document into the editor once (and when a version is restored); typing is never overwritten.
  const loaded = useRef(null)
  useEffect(() => {
    if (ref.current && loaded.current !== html && sanitizeHtml(ref.current.innerHTML) !== html) { ref.current.innerHTML = html; loaded.current = html }
  }, [html])

  function onInput() {
    const clean = sanitizeHtml(ref.current.innerHTML)
    loaded.current = clean
    const text = htmlToText(clean)
    const words = wordCount(text)
    ws.set({ doc: clean, sections: { ...ws.data.sections, doc: words >= (cfg.minWords || 1) ? text : '' } })
  }
  const run = (cmd) => {
    ref.current.focus()
    const [c, v] = cmd.split(':')
    document.execCommand(c, false, v || null)
    onInput()
  }
  const wrap = (body) => `<!doctype html><html><head><meta charset="utf-8"><title>Document</title></head><body>${body}</body></html>`

  return (
    <div className="tool">
      <div className="tool-bar">
        {!ctx.readOnly && BTN.map(([c, ic, label]) => <button key={c} type="button" className="icon-tool" title={label} aria-label={label} onMouseDown={(e) => { e.preventDefault(); run(c) }}><Icon name={ic} /></button>)}
        {!ctx.readOnly && <button type="button" className="icon-tool" title="Insert link" aria-label="Insert link" onMouseDown={(e) => { e.preventDefault(); setLinking(true) }}><Icon name="fa-link" /></button>}
        <span className="grow" />
        <span className="counter">{counts.words.toLocaleString()} words · {counts.chars.toLocaleString()} characters{cfg.minWords ? ` · minimum ${cfg.minWords} words` : ''}</span>
        <button type="button" className="btn secondary" onClick={ctx.showHistory}><Icon name="fa-clock-rotate-left" /> Draft history</button>
        <div className="menu">
          <button type="button" className="btn secondary" onClick={() => download('document.html', wrap(html), 'text/html')}>Export HTML</button>
          <button type="button" className="btn secondary" onClick={() => download('document.txt', text)}>Export text</button>
          <button type="button" className="btn secondary" onClick={() => download('document.doc', wrap(html), 'application/msword')}>Export Word</button>
        </div>
      </div>
      <div ref={ref} className="rte" contentEditable={!ctx.readOnly} suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Document editor" spellCheck onInput={onInput} />
      {cfg.tools.includes('attachments') && <FilePanel ctx={ctx} kind="attachment" title="Attachments" />}
      {linking && (
        <FormDialog title="Insert link" confirmLabel="Insert" onClose={() => setLinking(false)} fields={[{ name: 'url', label: 'Link address', type: 'url', required: true, placeholder: 'https://…' }]}
          validate={(d) => ({ url: /^https?:\/\/\S+$/i.test(d.url) ? '' : 'Enter a link starting with http:// or https://' })}
          onSubmit={(d) => { ref.current.focus(); document.execCommand('createLink', false, d.url); onInput() }} />
      )}
    </div>
  )
}
