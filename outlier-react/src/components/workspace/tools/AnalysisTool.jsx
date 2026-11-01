import { useMemo, useRef } from 'react'
import DataGrid from '../DataGrid'
import FilePanel from '../FilePanel'
import { BarChart, LineChart } from '../../charts'
import { Icon } from '../../ui'
import { download, parseCsv, toCsv } from '../../../utils/csv'
import { uid } from '../../../utils/sanitize'
import { useToast } from '../../../context/ToastContext'

const FNS = { sum: (a) => a.reduce((t, x) => t + x, 0), avg: (a) => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : 0), min: (a) => Math.min(...a), max: (a) => Math.max(...a), count: (a) => a.length,
  median: (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0 } }
// Accepts "1,000", "$12.50" and "45%" as numbers.
const toNum = (v) => (String(v ?? '').trim() === '' ? NaN : Number(String(v).replace(/[$,%\s]/g, '')))
const nums = (rows, key) => rows.map((r) => toNum(r[key])).filter((n) => Number.isFinite(n))
const round = (n) => Math.round(n * 1e4) / 1e4

export default function AnalysisTool({ cfg, ws, ctx }) {
  const toast = useToast()
  const input = useRef(null)
  const a = ws.data.analysis || { dataset: null, calcs: [], chart: { type: 'bar', x: '', y: '', agg: 'sum' }, findings: '' }
  const ds = a.dataset
  const save = (patch) => { const next = { ...a, ...patch }; ws.set({ analysis: next, sections: { ...ws.data.sections, analysis: next.findings.trim() } }) }
  const numericCols = ds ? ds.columns.filter((c) => c.type === 'number') : []

  async function load(file) {
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error('Datasets saved in the workspace can be up to 3 MB. Attach larger files in the Files section.')
      const [head, ...body] = parseCsv(await file.text())
      if (!head || !body.length) throw new Error('The file needs a header row and at least one data row.')
      const columns = head.map((h, i) => {
        const key = `c${i}`
        const sample = body.slice(0, 50).map((r) => r[i]).filter((v) => v !== undefined && v !== '')
        return { key, label: h.trim() || `Column ${i + 1}`, type: sample.length && sample.every((v) => Number.isFinite(toNum(v))) ? 'number' : 'text' }
      })
      const rows = body.slice(0, 20000).map((r) => ({ _id: uid(), ...Object.fromEntries(columns.map((c, i) => [c.key, r[i] ?? ''])) }))
      save({ dataset: { name: file.name, columns, rows }, calcs: [], chart: { type: 'bar', x: columns[0].key, y: columns.find((c) => c.type === 'number')?.key || '', agg: 'sum' } })
      toast.success(`Loaded ${rows.length} rows.`)
    } catch (e) { toast.error(e.message) }
    if (input.current) input.current.value = ''
  }

  const results = useMemo(() => (ds ? a.calcs.map((c) => { const v = nums(ds.rows, c.column); return { ...c, value: v.length ? round(FNS[c.fn](v)) : null, n: v.length } }) : []), [ds, a.calcs])
  const chartData = useMemo(() => {
    if (!ds || !a.chart.x) return []
    const groups = new Map()
    for (const r of ds.rows) { const k = String(r[a.chart.x] ?? '') || '(blank)'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r) }
    return [...groups.entries()].slice(0, 30).map(([label, rs]) => ({ label: label.slice(0, 14), v: a.chart.agg === 'count' || !a.chart.y ? rs.length : round(FNS[a.chart.agg](nums(rs, a.chart.y))) }))
  }, [ds, a.chart])

  return (
    <div className="tool">
      <div className="tool-bar">
        {!ctx.readOnly && <><button type="button" className="btn" onClick={() => input.current.click()}><Icon name="fa-file-csv" /> {ds ? 'Replace dataset' : 'Upload CSV dataset'}</button><input ref={input} hidden type="file" accept=".csv,.tsv,text/csv" onChange={(e) => e.target.files[0] && load(e.target.files[0])} /></>}
        {ds && <span className="counter">{ds.name} · {ds.rows.length.toLocaleString()} rows · {ds.columns.length} columns</span>}
        <span className="grow" />
        {ds && <button type="button" className="btn secondary" onClick={() => download('dataset.csv', toCsv(ds.columns, ds.rows), 'text/csv')}>Export data</button>}
      </div>
      {!ds && <p className="muted">Upload a CSV or TSV file to start. Excel files can be attached below as supporting files.</p>}
      {ds && (
        <>
          {cfg.tools.includes('table') && <section><h3>Data preview</h3><DataGrid columns={ds.columns} rows={ds.rows.slice(0, 100)} readOnly showErrors={false} />{ds.rows.length > 100 && <p className="muted small">Showing the first 100 of {ds.rows.length.toLocaleString()} rows. Calculations and charts use every row.</p>}</section>}
          {cfg.tools.includes('calc') && (
            <section><h3>Calculations</h3>
              {results.map((r) => (
                <div className="calc" key={r.id}><b>{r.fn.toUpperCase()}</b> of {ds.columns.find((c) => c.key === r.column)?.label}<span className="calc-value">{r.value ?? '—'}</span><small>{r.n} values</small>
                  {!ctx.readOnly && <button type="button" className="link-btn danger-text" onClick={() => save({ calcs: a.calcs.filter((x) => x.id !== r.id) })} aria-label="Remove calculation"><Icon name="fa-trash" /></button>}</div>
              ))}
              {!ctx.readOnly && numericCols.length > 0 && (
                <form className="inline-actions" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); save({ calcs: [...a.calcs, { id: uid(), fn: f.get('fn'), column: f.get('column') }] }) }}>
                  <select name="fn" aria-label="Function">{Object.keys(FNS).map((f) => <option key={f}>{f}</option>)}</select>
                  <select name="column" aria-label="Column">{numericCols.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
                  <button className="btn secondary" type="submit"><Icon name="fa-plus" /> Add calculation</button>
                </form>
              )}
              {!numericCols.length && <p className="muted small">No numeric columns were detected.</p>}
            </section>
          )}
          {cfg.tools.includes('chart') && (
            <section><h3>Chart</h3>
              <div className="inline-actions">
                <label>Type <select disabled={ctx.readOnly} value={a.chart.type} onChange={(e) => save({ chart: { ...a.chart, type: e.target.value } })}><option value="bar">Bar</option><option value="line">Line</option></select></label>
                <label>Group by <select disabled={ctx.readOnly} value={a.chart.x} onChange={(e) => save({ chart: { ...a.chart, x: e.target.value } })}>{ds.columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
                <label>Measure <select disabled={ctx.readOnly} value={a.chart.y} onChange={(e) => save({ chart: { ...a.chart, y: e.target.value } })}><option value="">(row count)</option>{numericCols.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
                <label>Using <select disabled={ctx.readOnly} value={a.chart.agg} onChange={(e) => save({ chart: { ...a.chart, agg: e.target.value } })}>{['sum', 'avg', 'min', 'max', 'count', 'median'].map((f) => <option key={f}>{f}</option>)}</select></label>
              </div>
              {a.chart.type === 'line' ? <LineChart data={chartData} series={[{ key: 'v', label: 'Value' }]} /> : <BarChart data={chartData} series={[{ key: 'v', label: 'Value' }]} />}
            </section>
          )}
        </>
      )}
      {cfg.tools.includes('report') && (
        <section><h3>Findings</h3>
          <textarea className="big-text" readOnly={ctx.readOnly} aria-label="Findings" placeholder="Summarise what the data shows…" value={a.findings} onChange={(e) => save({ findings: e.target.value })} />
          <button type="button" className="btn secondary" onClick={() => download('results.csv', ['Calculation,Column,Value', ...results.map((r) => `${r.fn},"${ds.columns.find((c) => c.key === r.column)?.label}",${r.value ?? ''}`)].join('\n'), 'text/csv')} disabled={!results.length}>Export results</button>
        </section>
      )}
      <FilePanel ctx={ctx} kind="data" title="Spreadsheets and other data files" hint="Excel and large files are stored as attachments; only CSV/TSV is parsed here." />
    </div>
  )
}
