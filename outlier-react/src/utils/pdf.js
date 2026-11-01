// PDF generation. jsPDF is loaded on demand. Every number comes from the server-calculated statement/payment records.
import { fmtDate, fmtDateTime, hoursLabel, money } from './format'

async function logo() {
  try {
    const blob = await (await fetch('/images/outlier.png')).blob()
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob) })
  } catch { return null }
}

async function start(title, subtitle, meta) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const img = await logo()
  if (img) doc.addImage(img, 'PNG', 40, 34, 119, 26)
  else { doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('Outlier', 40, 52) }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(17, 24, 39); doc.text(title, 40, 92)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(107, 114, 128); doc.text(subtitle, 40, 108)
  let y = 130
  doc.setTextColor(31, 41, 55)
  for (const [k, v] of meta) { doc.setFont('helvetica', 'bold'); doc.text(`${k}:`, 40, y); doc.setFont('helvetica', 'normal'); doc.text(String(v ?? '—'), 150, y); y += 15 }
  return { doc, y: y + 8 }
}

function table(ctx, heads, rows, widths, align = []) {
  const { doc } = ctx
  const x0 = 40
  const row = (cells, bold, fill) => {
    if (ctx.y > 770) { doc.addPage(); ctx.y = 50 }
    if (fill) { doc.setFillColor(...fill); doc.rect(x0 - 4, ctx.y - 11, 520, 18, 'F') }
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(9)
    let x = x0
    cells.forEach((c, i) => {
      const text = doc.splitTextToSize(String(c ?? ''), widths[i] - 8)[0]
      if (align[i] === 'r') doc.text(text, x + widths[i] - 8, ctx.y, { align: 'right' }); else doc.text(text, x, ctx.y)
      x += widths[i]
    })
    ctx.y += 18
  }
  row(heads, true, [241, 245, 255])
  rows.forEach((r) => row(r, false))
  ctx.y += 6
}

function footer(doc) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120, 120, 120)
    doc.text(`Outlier · Amounts in USD · Generated ${fmtDateTime(new Date())} · Page ${i} of ${pages}`, 40, 820)
    doc.text('Approved earnings are not payments already made. Payments are processed on the last Tuesday of each month.', 40, 808)
  }
}

export async function statementPdf(st, kind) {
  const ctx = await start(kind === 'week' ? 'Weekly earnings statement' : kind === 'month' ? 'Monthly earnings statement' : 'Earnings statement', `${fmtDate(st.from)} – ${fmtDate(st.to)}`,
    [['Tasker', st.taskerName], ['Statement reference', st.reference], ['Reporting period', `${fmtDate(st.from)} – ${fmtDate(st.to)}`], ['Generated', fmtDateTime(st.generatedAt)], ['Currency', 'USD']])
  const { doc } = ctx
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Project breakdown', 40, ctx.y); ctx.y += 16
  table(ctx, ['Project', 'Hours', 'Rate', 'Earnings', 'Pending', 'Approved', 'Paid'], st.projects.map((p) => [p.title, (p.seconds / 3600).toFixed(2), `${money(p.rate)}/hr`, money(p.tracked), money(p.pending), money(p.approved), money(p.paid)]), [170, 45, 65, 65, 55, 60, 60], ['l', 'r', 'r', 'r', 'r', 'r', 'r'])
  if (st.weeks.length > 1 || kind === 'month') {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Weekly summary', 40, ctx.y); ctx.y += 16
    table(ctx, ['Week', 'Hours', 'Earnings', 'Pending', 'Approved', 'Paid'], st.weeks.map((w) => [`${fmtDate(w.start)} – ${fmtDate(w.end)}`, (w.seconds / 3600).toFixed(2), money(w.tracked), money(w.pending), money(w.approved), money(w.paid)]), [190, 50, 70, 70, 70, 70], ['l', 'r', 'r', 'r', 'r', 'r'])
  }
  const t = st.totals
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Totals', 40, ctx.y); ctx.y += 16
  table(ctx, ['', ''], [['Total hours worked', hoursLabel(t.seconds)], ['Total tracked earnings', money(t.tracked)], ['Pending approval', money(t.pending)], ['Approved for payment (outstanding)', money(t.approved)], ['Paid', money(t.paid)]], [300, 120], ['l', 'r'])
  if (st.payments.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Payments in this period', 40, ctx.y); ctx.y += 16
    table(ctx, ['Reference', 'Status', 'Payment date', 'Method', 'Amount'], st.payments.map((p) => [p.reference, p.status, fmtDate(p.cycleDate), p.method || '—', money(p.amount)]), [110, 80, 100, 130, 80], ['l', 'l', 'l', 'l', 'r'])
  }
  footer(doc)
  doc.save(`statement-${st.reference}.pdf`)
}

export async function receiptPdf(p, taskerName) {
  const ctx = await start('Payment receipt', `Reference ${p.paymentRef}`, [['Tasker', taskerName], ['Payment reference', p.paymentRef], ['Status', p.status], ['Payment period', p.cycleDate ? fmtDate(p.cycleDate) : '—'], ['Payment method', p.method || '—'], ['Paid on', p.paidAt ? fmtDateTime(p.paidAt) : 'Not paid yet'], ['Transfer reference', p.reference || '—']])
  table(ctx, ['Project', 'Approved hours', 'Rate', 'Amount'], [[p.assignments?.tasks?.title || 'Project', (p.seconds / 3600).toFixed(2), `${money(p.hourlyRate)}/hr`, money(p.amount)]], [250, 90, 90, 90], ['l', 'r', 'r', 'r'])
  footer(ctx.doc)
  ctx.doc.save(`receipt-${p.paymentRef}.pdf`)
}

export async function historyPdf(payments, taskerName) {
  const ctx = await start('Payment history', 'All payments on record', [['Tasker', taskerName], ['Payments', payments.length], ['Total', money(payments.filter((p) => p.status !== 'rejected').reduce((t, p) => t + Number(p.amount), 0))]])
  table(ctx, ['Date', 'Reference', 'Project', 'Hours', 'Amount', 'Status'], payments.map((p) => [fmtDate(p.createdAt), p.paymentRef, p.assignments?.tasks?.title || '', (p.seconds / 3600).toFixed(2), money(p.amount), p.status]), [60, 100, 150, 40, 70, 80], ['l', 'l', 'l', 'r', 'r', 'l'])
  footer(ctx.doc)
  ctx.doc.save('payment-history.pdf')
}
