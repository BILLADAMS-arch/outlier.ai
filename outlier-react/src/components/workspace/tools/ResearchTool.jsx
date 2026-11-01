import { useState } from 'react'
import DataGrid from '../DataGrid'
import FilePanel from '../FilePanel'
import { Icon } from '../../ui'
import { download } from '../../../utils/csv'
import { uid } from '../../../utils/sanitize'

const EMPTY = { notes: '', sources: [], findings: [], table: { columns: [{ key: 'a', label: 'Item', type: 'text' }, { key: 'b', label: 'Value', type: 'text' }], rows: [] }, report: { summary: '', method: '', conclusion: '' } }
const TABS = [['notes', 'Notes'], ['sources', 'Sources'], ['findings', 'Findings'], ['table', 'Data'], ['report', 'Report'], ['attachments', 'Files']]

export default function ResearchTool({ cfg, ws, ctx }) {
  const r = { ...EMPTY, ...(ws.data.research || {}) }
  const tabs = TABS.filter(([k]) => cfg.tools.includes(k))
  const [tab, setTab] = useState(tabs[0]?.[0])
  const ro = ctx.readOnly
  const save = (patch) => {
    const next = { ...r, ...patch }
    const text = [next.notes, ...next.sources.map((s) => `${s.title} ${s.url}`), ...next.findings.map((f) => f.finding), next.report.summary, next.report.conclusion].join(' ').trim()
    ws.set({ research: next, sections: { ...ws.data.sections, research: next.report.summary.trim() && (next.sources.length || next.findings.length) ? text : '' } })
  }
  const list = (key, blank) => ({
    add: () => save({ [key]: [...r[key], { id: uid(), ...blank }] }),
    set: (id, k, v) => save({ [key]: r[key].map((x) => (x.id === id ? { ...x, [k]: v } : x)) }),
    del: (id) => save({ [key]: r[key].filter((x) => x.id !== id) }),
  })
  const src = list('sources', { title: '', url: '', note: '' })
  const fnd = list('findings', { finding: '', evidence: '', confidence: 'Medium' })

  return (
    <div className="tool">
      <div className="tool-tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'notes' && <textarea className="big-text" readOnly={ro} aria-label="Research notes" placeholder="Write your research notes here…" value={r.notes} onChange={(e) => save({ notes: e.target.value })} />}
      {tab === 'sources' && (
        <div>
          {r.sources.map((s) => (
            <div className="row-fields" key={s.id}>
              <input readOnly={ro} placeholder="Source title" aria-label="Source title" value={s.title} onChange={(e) => src.set(s.id, 'title', e.target.value)} />
              <input readOnly={ro} placeholder="https://…" aria-label="Source link" type="url" value={s.url} className={s.url && !/^https?:\/\/\S+$/i.test(s.url) ? 'bad' : ''} onChange={(e) => src.set(s.id, 'url', e.target.value)} />
              <input readOnly={ro} placeholder="What it shows" aria-label="Source note" value={s.note} onChange={(e) => src.set(s.id, 'note', e.target.value)} />
              {!ro && <button type="button" className="link-btn danger-text" onClick={() => src.del(s.id)} aria-label="Remove source"><Icon name="fa-trash" /></button>}
            </div>
          ))}
          {!r.sources.length && <p className="muted small">No sources yet. Add every reference you used.</p>}
          {!ro && <button type="button" className="btn secondary" onClick={src.add}><Icon name="fa-plus" /> Add source</button>}
        </div>
      )}
      {tab === 'findings' && (
        <div>
          {r.findings.map((f, i) => (
            <div className="finding" key={f.id}>
              <b>Finding {i + 1}</b>
              <textarea readOnly={ro} rows={2} placeholder="What did you find?" aria-label="Finding" value={f.finding} onChange={(e) => fnd.set(f.id, 'finding', e.target.value)} />
              <textarea readOnly={ro} rows={2} placeholder="Evidence or source" aria-label="Evidence" value={f.evidence} onChange={(e) => fnd.set(f.id, 'evidence', e.target.value)} />
              <div className="inline-actions"><label>Confidence <select disabled={ro} value={f.confidence} onChange={(e) => fnd.set(f.id, 'confidence', e.target.value)}>{['Low', 'Medium', 'High'].map((c) => <option key={c}>{c}</option>)}</select></label>
                {!ro && <button type="button" className="link-btn danger-text" onClick={() => fnd.del(f.id)}>Remove</button>}</div>
            </div>
          ))}
          {!ro && <button type="button" className="btn secondary" onClick={fnd.add}><Icon name="fa-plus" /> Add finding</button>}
        </div>
      )}
      {tab === 'table' && <DataGrid columns={r.table.columns} rows={r.table.rows} readOnly={ro} showErrors={false} onRows={(rows) => save({ table: { ...r.table, rows } })} onColumns={(columns) => save({ table: { ...r.table, columns } })} />}
      {tab === 'report' && (
        <div className="report">
          {[['summary', 'Summary'], ['method', 'Method'], ['conclusion', 'Conclusion and recommendations']].map(([k, l]) => (
            <label key={k}>{l}<textarea readOnly={ro} rows={k === 'summary' ? 6 : 5} value={r.report[k]} onChange={(e) => save({ report: { ...r.report, [k]: e.target.value } })} /></label>
          ))}
          <button type="button" className="btn secondary" onClick={() => download('report.txt', `SUMMARY\n${r.report.summary}\n\nMETHOD\n${r.report.method}\n\nCONCLUSION\n${r.report.conclusion}\n\nSOURCES\n${r.sources.map((s) => `- ${s.title} ${s.url}`).join('\n')}`)}>Export report</button>
        </div>
      )}
      {tab === 'attachments' && <FilePanel ctx={ctx} kind="attachment" title="Documents and files" />}
    </div>
  )
}
