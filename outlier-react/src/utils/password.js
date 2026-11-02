/** Password rules shown to the user. The server (Supabase) remains the real authority; these give instant feedback. */
export const passwordChecks = (p = '') => ({ length: p.length >= 8, number: /\d/.test(p) })

const LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
/** 0-4 strength score with a label. Counts length, digits, upper/lower case mix and symbols. */
export function passwordStrength(p = '') {
  if (!p) return { score: 0, label: '' }
  let pts = 0
  if (p.length >= 8) pts++
  if (p.length >= 12) pts++
  if (/\d/.test(p)) pts++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) pts++
  if (/[^A-Za-z0-9]/.test(p)) pts++
  const score = !passwordChecks(p).length ? 1 : Math.min(4, Math.max(1, pts - 1))
  return { score, label: LABELS[score] }
}
