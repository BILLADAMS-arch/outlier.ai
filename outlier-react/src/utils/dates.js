// Date helpers. Reporting periods are calendar dates in UTC, matching the server.
export const iso = (d) => d.toISOString().slice(0, 10)
export const parse = (s) => new Date(`${s}T00:00:00Z`)
export const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
export const todayIso = () => iso(new Date())
/** Monday of the week containing the date (weeks run Monday to Sunday). */
export const mondayOf = (s) => { const d = parse(s); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return iso(d) }
export const monthStart = (s) => `${s.slice(0, 7)}-01`
export const monthEnd = (s) => { const d = parse(monthStart(s)); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return iso(d) }
export const addMonths = (s, n) => { const d = parse(monthStart(s)); d.setUTCMonth(d.getUTCMonth() + n); return iso(d) }
export const monthLabel = (s) => parse(s).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
export const shortDay = (s) => parse(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
export const weekLabel = (s) => `${shortDay(s)}–${shortDay(addDays(s, 6))}`
/** Last Tuesday of the month containing the date (the platform's payment day). */
export function lastTuesday(s) {
  const d = parse(monthEnd(s))
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - 2 + 7) % 7))
  return iso(d)
}
