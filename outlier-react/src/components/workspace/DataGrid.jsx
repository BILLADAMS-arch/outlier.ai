import { validateCell } from '../../utils/csv'
import { Icon } from '../ui'
import { uid } from '../../utils/sanitize'

/** Spreadsheet-style table with typed, validated cells. Rows get a stable _id. Optional column management. */
export default function DataGrid({ columns, rows, onRows, onColumns, readOnly, showErrors = true, max = 2000 }) {
  const setCell = (i, key, v) => onRows(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  const addRow = () => rows.length < max && onRows([...rows, { _id: uid(), ...Object.fromEntries(columns.map((c) => [c.key, ''])) }])
  const delRow = (i) => onRows(rows.filter((_, j) => j !== i))
  const addCol = () => onColumns([...columns, { key: `c${uid()}`, label: `Column ${columns.length + 1}`, type: 'text', required: false }])
  const delCol = (key) => columns.length > 1 && onColumns(columns.filter((c) => c.key !== key))
  const rename = (key, label) => onColumns(columns.map((c) => (c.key === key ? { ...c, label } : c)))

  return (
    <div className="grid-wrap">
      <div className="table-wrap">
        <table className="data-grid">
          <thead>
            <tr>
              <th className="rownum">#</th>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {onColumns && !readOnly
                    ? <span className="colhead"><input aria-label="Column name" value={c.label} onChange={(e) => rename(c.key, e.target.value)} /><button type="button" className="link-btn danger-text" onClick={() => delCol(c.key)} aria-label={`Remove column ${c.label}`}><Icon name="fa-xmark" /></button></span>
                    : <>{c.label}{c.required && <span className="req"> *</span>}</>}
                </th>
              ))}
              {!readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r._id || i}>
                <td className="rownum">{i + 1}</td>
                {columns.map((c) => {
                  const err = showErrors ? validateCell(c, r[c.key]) : ''
                  return (
                    <td key={c.key} className={err ? 'cell-bad' : ''} title={err}>
                      {readOnly ? String(r[c.key] ?? '') : c.type === 'select' && c.options?.length
                        ? <select value={r[c.key] ?? ''} onChange={(e) => setCell(i, c.key, e.target.value)}><option value="" />{c.options.map((o) => <option key={o}>{o}</option>)}</select>
                        : <input type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'} step="any" value={r[c.key] ?? ''} aria-label={`${c.label}, row ${i + 1}`} onChange={(e) => setCell(i, c.key, e.target.value)} />}
                    </td>
                  )
                })}
                {!readOnly && <td><button type="button" className="link-btn danger-text" onClick={() => delRow(i)} aria-label={`Delete row ${i + 1}`}><Icon name="fa-trash" /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="inline-actions">
          <button type="button" className="btn secondary" onClick={addRow}><Icon name="fa-plus" /> Add row</button>
          {onColumns && <button type="button" className="btn secondary" onClick={addCol}><Icon name="fa-plus" /> Add column</button>}
        </div>
      )}
    </div>
  )
}
