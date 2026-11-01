import { useRef } from 'react'
import DataGrid from '../DataGrid'
import FilePanel from '../FilePanel'
import { Icon } from '../../ui'
import { download, parseCsv, toCsv, validRowCount } from '../../../utils/csv'
import { uid } from '../../../utils/sanitize'
import { useToast } from '../../../context/ToastContext'

export default function DataEntryTool({ cfg, ws, ctx }) {
  const toast = useToast()
  const input = useRef(null)
  const table = ws.data.table || { columns: cfg.columns, rows: [] }
  const columns = table.columns
  const valid = validRowCount(columns, table.rows)
  const target = cfg.targetRows || 0
  const complete = valid > 0 && valid === table.rows.filter((r) => columns.some((c) => String(r[c.key] ?? '').trim())).length && (!target || valid >= target)

  const save = (next) => {
    const v = validRowCount(next.columns, next.rows)
    const filled = next.rows.filter((r) => next.columns.some((c) => String(r[c.key] ?? '').trim())).length
    ws.set({ table: next, sections: { ...ws.data.sections, table: v > 0 && v === filled && (!target || v >= target) ? `${v} valid rows` : '' } })
  }

  async function importCsv(file) {
    try {
      const parsed = parseCsv(await file.text())
      if (parsed.length < 2) throw new Error('The file needs a header row and at least one data row.')
      const [head, ...body] = parsed
      // Match file columns to the project's columns by label; unknown columns are ignored.
      const idx = columns.map((c) => head.findIndex((h) => h.trim().toLowerCase() === c.label.toLowerCase()))
      if (idx.every((i) => i < 0)) throw new Error(`None of the file's column names match: ${columns.map((c) => c.label).join(', ')}`)
      const rows = body.slice(0, 5000).map((r) => ({ _id: uid(), ...Object.fromEntries(columns.map((c, k) => [c.key, idx[k] >= 0 ? r[idx[k]] ?? '' : ''])) }))
      save({ ...table, rows: [...table.rows, ...rows] })
      toast.success(`Imported ${rows.length} rows.`)
    } catch (e) { toast.error(e.message) }
    if (input.current) input.current.value = ''
  }

  return (
    <div className="tool">
      <div className="tool-bar">
        <span className={`completion${complete ? ' done' : ''}`}><Icon name={complete ? 'fa-circle-check' : 'fa-circle-half-stroke'} /> {valid} valid row{valid === 1 ? '' : 's'}{target ? ` of ${target} required` : ''}</span>
        <span className="grow" />
        {!ctx.readOnly && cfg.tools.includes('csv') && <><button type="button" className="btn secondary" onClick={() => input.current.click()}><Icon name="fa-file-import" /> Import CSV</button><input ref={input} type="file" accept=".csv,.tsv,text/csv" hidden onChange={(e) => e.target.files[0] && importCsv(e.target.files[0])} /></>}
        {cfg.tools.includes('csv') && <button type="button" className="btn secondary" onClick={() => download('data.csv', toCsv(columns, table.rows), 'text/csv')}><Icon name="fa-file-export" /> Export CSV</button>}
      </div>
      {target > 0 && <div className="progress" aria-label="Completion"><span style={{ width: `${Math.min(100, (valid / target) * 100)}%` }} /></div>}
      <DataGrid columns={columns} rows={table.rows} readOnly={ctx.readOnly} onRows={(rows) => save({ ...table, rows })} onColumns={cfg.configured ? undefined : (cols) => save({ ...table, columns: cols })} />
      {cfg.tools.includes('attachments') && <FilePanel ctx={ctx} kind="attachment" title="Attachments" />}
    </div>
  )
}
