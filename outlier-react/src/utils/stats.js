const WEEK_MS = 7 * 24 * 3600 * 1000

/**
 * Dashboard numbers, derived only from the tasker's real records.
 *  - totalEarnings: sum of payments created when an admin approved work (not rejected)
 *  - tasksCompleted: assignments with status "completed"
 *  - avgPerWeek: completed tasks / weeks since the first assignment (at least 1 week)
 */
export function computeStats(assignments = [], payments = [], now = Date.now()) {
  const completed = assignments.filter((a) => a.status === 'completed').length
  const totalEarnings = payments.filter((p) => p.status !== 'rejected').reduce((t, p) => t + Number(p.amount), 0)
  let avgPerWeek = 0
  if (completed && assignments.length) {
    const first = Math.min(...assignments.map((a) => +new Date(a.createdAt)))
    const weeks = Math.max(1, (now - first) / WEEK_MS)
    avgPerWeek = Math.round((completed / weeks) * 10) / 10
  }
  return { totalEarnings, tasksCompleted: completed, avgPerWeek }
}

const startOfWeek = (ms) => { const d = new Date(ms); const dow = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow) }
const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null)

/** Weeks of activity since the tasker's first project (minimum 1): the denominator of the weekly average. */
export function activityWeeks(assignments = [], now = Date.now()) {
  if (!assignments.length) return 0
  const first = Math.min(...assignments.map((a) => +new Date(a.createdAt)))
  return Math.max(1, Math.ceil((now - first) / WEEK_MS))
}

/** Earnings approved this calendar month vs last month. `change` is null when last month has nothing to compare with. */
export function earningsTrend(payments = [], now = Date.now()) {
  const d = new Date(now)
  const thisStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  const lastStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)
  let thisMonth = 0, lastMonth = 0
  for (const p of payments) {
    if (p.status === 'rejected') continue
    const t = +new Date(p.createdAt)
    if (t >= thisStart) thisMonth += Number(p.amount)
    else if (t >= lastStart) lastMonth += Number(p.amount)
  }
  return { thisMonth, lastMonth, change: pct(thisMonth, lastMonth) }
}

/** Projects completed this week vs last week (Monday to Sunday, UTC). */
export function completedTrend(assignments = [], now = Date.now()) {
  const thisStart = startOfWeek(now), lastStart = thisStart - WEEK_MS
  let thisWeek = 0, lastWeek = 0
  for (const a of assignments) {
    if (a.status !== 'completed' || !a.completedAt) continue
    const t = +new Date(a.completedAt)
    if (t >= thisStart) thisWeek++
    else if (t >= lastStart) lastWeek++
  }
  return { thisWeek, lastWeek, change: pct(thisWeek, lastWeek) }
}
