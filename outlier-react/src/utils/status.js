export const ACCOUNT_STATUS = { pending: 'Pending Account Approval', approved: 'Approved', rejected: 'Rejected' }

// Per-tasker project statuses
export const PROJECT_STATUS = {
  available: 'Available Project',
  applied: 'Application Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Application Not Selected',
}
export const APPLICATION_STATUS = { submitted: 'Pending', reviewing: 'Under review', accepted: 'Approved', rejected: 'Not selected', withdrawn: 'Withdrawn' }
export const PAYMENT_STATUS = { pending: 'Awaiting approval', approved: 'Approved – to be paid', paid: 'Paid', rejected: 'Not approved' }
export const BANK_STATUS = { pending: 'Pending verification', verified: 'Verified', rejected: 'Rejected' }
export const DIFFICULTIES = ['Easy', 'Intermediate', 'Hard', 'Expert']
export const BANDS = { Easy: [10, 25], Intermediate: [25, 50], Hard: [50, 90], Expert: [90, 200] }
export const AVAILABILITY = ['Under 10 hours/week', '10–20 hours/week', '20–40 hours/week', 'Full-time (40+ hours/week)']

/** Where this task stands for the signed-in tasker. */
export function projectStatusFor(taskId, assignments, applications) {
  const a = assignments.find((x) => x.taskId === taskId)
  if (a) return a.status
  const app = applications.find((x) => x.taskId === taskId && x.status !== 'withdrawn')
  if (app) return app.status === 'rejected' ? 'declined' : 'applied'
  return 'available'
}
