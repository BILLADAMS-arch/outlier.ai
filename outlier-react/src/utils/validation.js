// Must match Supabase: Authentication > Providers > Email > "Email OTP Length".
export const OTP_LENGTH = 6
export const otpOk = (code) => new RegExp(`^\\d{${OTP_LENGTH}}$`).test((code || '').trim())

export const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || '')

/** US ABA routing-number checksum. */
export function abaValid(r) {
  if (!/^\d{9}$/.test(r || '')) return false
  const d = r.split('').map(Number)
  return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10 === 0
}

export function passwordProblem(p) {
  if (!p || p.length < 8) return 'Use at least 8 characters.'
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Use letters and at least one number.'
  return ''
}

export const nameProblem = (n) => {
  const v = (n || '').trim()
  if (v.length < 2) return 'Enter your full name.'
  if (!/\s/.test(v)) return 'Enter your first and last name.'
  if (v.length > 80) return 'Name is too long.'
  return ''
}
