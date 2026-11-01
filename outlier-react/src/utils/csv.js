/** Parses CSV/TSV text into rows of strings. Handles quotes, escaped quotes and newlines inside quotes. */
export function parseCsv(text, delimiter) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const d = delimiter || (src.split('\n')[0].split('\t').length > src.split('\n')[0].split(',').length ? '\t' : ',')
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false } else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === d) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const cellOut = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
export const toCsv = (columns, rows) => [columns.map((c) => cellOut(c.label)).join(','), ...rows.map((r) => columns.map((c) => cellOut(r[c.key])).join(','))].join('\r\n')

export function download(filename, content, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Validates one cell against its column definition. Returns an error message or ''. */
export function validateCell(col, value) {
  const v = String(value ?? '').trim()
  if (!v) return col.required ? 'Required' : ''
  if (col.type === 'number' && !Number.isFinite(Number(v))) return 'Must be a number'
  if (col.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Invalid email'
  if (col.type === 'date' && Number.isNaN(Date.parse(v))) return 'Invalid date'
  if (col.type === 'select' && col.options?.length && !col.options.includes(v)) return `Must be one of: ${col.options.join(', ')}`
  return ''
}

/** Number of non-empty rows whose cells all pass validation. */
export const validRowCount = (columns, rows) => rows.filter((r) => columns.some((c) => String(r[c.key] ?? '').trim()) && columns.every((c) => !validateCell(c, r[c.key]))).length
