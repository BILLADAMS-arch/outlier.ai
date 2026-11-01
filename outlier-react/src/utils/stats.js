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
