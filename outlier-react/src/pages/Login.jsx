import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { emailOk, nameProblem, passwordProblem } from '../utils/validation'

const COOLDOWN = 60

export default function Login() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'up' : 'in') // in | up | verify | forgot | reset
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', code: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  if (auth.session && mode !== 'reset') return <Navigate to="/dashboard" replace />
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const go = (m) => { setMode(m); setErrors({}); setFormError(''); setInfo('') }

  async function run(problems, work) {
    setErrors(problems); setFormError(''); setInfo('')
    if (Object.keys(problems).length) return
    setBusy(true)
    try { await work() } catch (err) { setFormError(err.message) } finally { setBusy(false) }
  }
  const email = form.email.trim()
  const codeProblem = (c) => (/^\d{4,10}$/.test(c.trim()) ? '' : 'Enter the code from your email.')

  const submit = (e) => {
    e.preventDefault()
    if (mode === 'in') return run({ ...(!emailOk(email) && { email: 'Enter a valid email address.' }), ...(!form.password && { password: 'Enter your password.' }) },
      async () => { await auth.signIn({ email, password: form.password }); navigate('/dashboard', { replace: true }) })
    if (mode === 'up') return run({ ...(nameProblem(form.fullName) && { fullName: nameProblem(form.fullName) }), ...(!emailOk(email) && { email: 'Enter a valid email address.' }),
      ...(passwordProblem(form.password) && { password: passwordProblem(form.password) }), ...(form.confirm !== form.password && { confirm: 'Passwords do not match.' }) },
    async () => { const r = await auth.signUp({ fullName: form.fullName, email, password: form.password }); if (r.needsConfirmation) { go('verify'); setInfo(`We sent a verification code to ${email}.`); setCooldown(COOLDOWN) } else navigate('/dashboard', { replace: true }) })
    if (mode === 'verify') return run({ ...(codeProblem(form.code) && { code: codeProblem(form.code) }) },
      async () => { await auth.verifySignupCode({ email, code: form.code }); navigate('/dashboard', { replace: true }) })
    if (mode === 'forgot') return run({ ...(!emailOk(email) && { email: 'Enter a valid email address.' }) },
      async () => { await auth.requestPasswordReset(email); go('reset'); setInfo(`If an account exists for ${email}, we sent a reset code.`); setCooldown(COOLDOWN) })
    return run({ ...(codeProblem(form.code) && { code: codeProblem(form.code) }), ...(passwordProblem(form.password) && { password: passwordProblem(form.password) }), ...(form.confirm !== form.password && { confirm: 'Passwords do not match.' }) },
      async () => { await auth.resetPasswordWithCode({ email, code: form.code, password: form.password }); navigate('/dashboard', { replace: true }) })
  }
  const resend = () => run({}, async () => {
    if (mode === 'verify') await auth.resendSignupCode(email); else await auth.requestPasswordReset(email)
    setInfo('A new code was sent. Older codes no longer work.'); setCooldown(COOLDOWN)
  })

  const field = (name, label, type, extra = {}) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} type={type} value={form[name]} onChange={set(name)} aria-invalid={errors[name] ? 'true' : undefined} aria-describedby={`${name}-err`} {...extra} />
      <div className="field-error" id={`${name}-err`}>{errors[name]}</div>
    </div>
  )
  const tabs = mode === 'in' || mode === 'up'
  const titles = { in: ['Welcome back', 'Sign in to see your dashboard and projects.'], up: ['Create your account', 'Your full name becomes your tasker name and cannot be changed later.'],
    verify: ['Verify your email', 'Enter the one-time code we emailed you. Your account stays inactive until it is verified.'], forgot: ['Forgot your password?', 'Enter your email and we will send a one-time reset code.'],
    reset: ['Choose a new password', 'Enter the code from your email and your new password. The code works once and expires.'] }[mode]

  return (
    <div className="auth-wrap">
      <Link to="/"><img className="auth-logo" src="/images/outlier.png" alt="Outlier" /></Link>
      <div className="auth-card">
        {tabs && (
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'in'} className={`tab-link${mode === 'in' ? ' active' : ''}`} onClick={() => go('in')}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'up'} className={`tab-link${mode === 'up' ? ' active' : ''}`} onClick={() => go('up')}>Create account</button>
          </div>
        )}
        <h1>{titles[0]}</h1>
        <p className="muted">{titles[1]}</p>
        {info && <div className="callout info" role="status">{info}</div>}
        <form onSubmit={submit} noValidate>
          {mode === 'up' && field('fullName', 'Full name', 'text', { autoComplete: 'name', maxLength: 80 })}
          {(mode === 'in' || mode === 'up' || mode === 'forgot') && field('email', 'Email', 'email', { autoComplete: 'email' })}
          {(mode === 'verify' || mode === 'reset') && field('code', 'One-time code', 'text', { inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 10, placeholder: '123456' })}
          {(mode === 'in' || mode === 'up' || mode === 'reset') && field('password', mode === 'in' ? 'Password' : mode === 'reset' ? 'New password (8+ characters, with a number)' : 'Password (8+ characters, with a number)', 'password', { autoComplete: mode === 'in' ? 'current-password' : 'new-password' })}
          {(mode === 'up' || mode === 'reset') && field('confirm', 'Confirm password', 'password', { autoComplete: 'new-password' })}
          {formError && <div className="callout bad" role="alert">{formError}</div>}
          <button className="btn big" type="submit" disabled={busy}>{busy ? 'Please wait…' : { in: 'Sign in', up: 'Create account', verify: 'Verify and continue', forgot: 'Send reset code', reset: 'Reset password' }[mode]}</button>
        </form>
        <div className="auth-links">
          {mode === 'in' && <button type="button" className="link-btn" onClick={() => go('forgot')}>Forgot your password?</button>}
          {(mode === 'verify' || mode === 'reset') && <button type="button" className="link-btn" disabled={cooldown > 0 || busy} onClick={resend}>{cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}</button>}
          {(mode === 'verify' || mode === 'forgot' || mode === 'reset') && <button type="button" className="link-btn" onClick={() => go('in')}>Back to sign in</button>}
        </div>
        {mode === 'up' && <p className="muted small">If you did not request this, nothing happens: no account is active until you enter the code we email.</p>}
      </div>
    </div>
  )
}
