export const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

const pad = (n) => String(n).padStart(2, '0')
/** 3725 -> "01:02:05" */
export function hms(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}
/** Hours as a decimal with two places: 5400 -> "1.50 h" */
export const hoursLabel = (seconds) => `${((seconds || 0) / 3600).toFixed(2)} h`

/** Earnings = hours x hourly rate, rounded to cents (matches the database). */
export const earningsFor = (seconds, rate) => Math.round(((seconds || 0) * Number(rate || 0)) / 3600 * 100) / 100

export const rateTier = (r) => (r < 25 ? 'Beginner' : r < 50 ? 'Intermediate' : r < 90 ? 'Advanced' : r < 140 ? 'Expert' : 'Specialist')
