import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/auth/AuthLayout'
import { PasswordField, PasswordStrength, TextField } from '../components/auth/fields'
import { Icon } from '../components/ui'
import { emailOk, nameProblem, OTP_LENGTH, otpOk, passwordProblem } from '../utils/validation'

const COOLDOWN = 60
const TITLES = {
  in: ['Welcome back', 'Sign in to your Outlier account.'],
  up: ['Create your Outlier account', 'Your full name becomes your tasker name and cannot be changed later.'],
  verify: ['Verify your email', `Enter the ${OTP_LENGTH}-digit code we emailed you. It works once and expires in 5 minutes. Your account stays inactive until it is verified.`],
  forgot: ['Reset your password', `Enter your email address and we'll send you a ${OTP_LENGTH}-digit code to reset it.`],
  reset: ['Choose a new password', `Enter the ${OTP_LENGTH}-digit code from your email and your new password.`],
}
const SUBMIT = { in: 'Sign in', up: 'Create account', verify: 'Verify and continue', forgot: 'Send reset instructions', reset: 'Reset password' }

/** Instant, per-mode validation. The server still has the final say. */
function validate(mode, f) {
  const e = {}
  const email = f.email.trim()
  if (['in', 'up', 'forgot'].includes(mode) && !emailOk(email)) e.email = email ? 'Enter a valid email address.' : 'Enter your email address.'
  if (mode === 'in' && !f.password) e.password = 'Enter your password.'
  if (mode === 'up') {
    if (nameProblem(f.fullName)) e.fullName = nameProblem(f.fullName)
    if (passwordProblem(f.password)) e.password = passwordProblem(f.password)
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match.'
  }
  if (mode === 'verify' || mode === 'reset') if (!otpOk(f.code)) e.code = `Enter the ${OTP_LENGTH}-digit code from your email.`
  if (mode === 'reset') {
    if (passwordProblem(f.password)) e.password = passwordProblem(f.password)
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match.'
  }
  return e
}
// Required fields that must be filled before the button enables.
const REQUIRED = { in: ['email', 'password'], up: ['fullName', 'email', 'password', 'confirm'], verify: ['code'], forgot: ['email'], reset: ['code', 'password', 'confirm'] }

export default function Login() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'up' : 'in') // in | up | verify | forgot | reset
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', code: '', remember: true })
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const tabRefs = useRef({})

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const errors = useMemo(() => validate(mode, form), [mode, form])
  if (auth.session && mode !== 'reset') return <Navigate to="/dashboard" replace />

  const email = form.email.trim()
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))
  const err = (k) => ((touched[k] || submitted) ? errors[k] : '')
  const go = (m, message = '') => { setMode(m); setTouched({}); setSubmitted(false); setFormError(''); setInfo(message) }
  const filled = REQUIRED[mode].every((k) => String(form[k]).trim() !== '')

  async function work() {
    if (mode === 'in') { await auth.signIn({ email, password: form.password, remember: form.remember }); navigate('/dashboard', { replace: true }) }
    else if (mode === 'up') {
      const r = await auth.signUp({ fullName: form.fullName, email, password: form.password })
      if (r.needsConfirmation) { go('verify', `We sent a ${OTP_LENGTH}-digit verification code to ${email}.`); setForm((f) => ({ ...f, code: '', password: '', confirm: '' })); setCooldown(COOLDOWN) } else navigate('/dashboard', { replace: true })
    } else if (mode === 'verify') { await auth.verifySignupCode({ email, code: form.code }); navigate('/dashboard', { replace: true }) }
    else if (mode === 'forgot') { await auth.requestPasswordReset(email); go('reset', `If an account exists for ${email}, we've sent a ${OTP_LENGTH}-digit reset code. Check your inbox.`); setCooldown(COOLDOWN) }
    else { await auth.resetPasswordWithCode({ email, code: form.code, password: form.password }); navigate('/dashboard', { replace: true }) }
  }

  async function submit(e) {
    e.preventDefault()
    setSubmitted(true); setFormError('')
    const first = Object.keys(errors)[0]
    if (first) { document.getElementById(`au-${first}`)?.focus(); return }
    setBusy(true)
    try { await work() } catch (x) { setFormError(x.message) } finally { setBusy(false) }
  }

  async function resend() {
    setBusy(true); setFormError('')
    try {
      if (mode === 'verify') await auth.resendSignupCode(email); else await auth.requestPasswordReset(email)
      setInfo('A new code was sent. Older codes no longer work.'); setCooldown(COOLDOWN)
    } catch (x) { setFormError(x.message) } finally { setBusy(false) }
  }

  const onTabKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const next = mode === 'in' ? 'up' : 'in'
    go(next); tabRefs.current[next]?.focus()
  }
  const tabs = mode === 'in' || mode === 'up'
  const [title, subtitle] = TITLES[mode]
  const common = (name) => ({ id: `au-${name}`, value: form[name], onChange: set(name), onBlur: blur(name), error: err(name), disabled: busy })

  return (
    <AuthLayout>
      <div className="au-card">
        {tabs && (
          <div className="au-tabs" role="tablist" aria-label="Sign in or create an account" onKeyDown={onTabKey}>
            {[['in', 'fa-user', 'Sign In'], ['up', 'fa-user-plus', 'Create Account']].map(([k, ic, label]) => (
              <button key={k} ref={(el) => { tabRefs.current[k] = el }} type="button" role="tab" id={`tab-${k}`} aria-selected={mode === k} aria-controls="au-form" tabIndex={mode === k ? 0 : -1}
                className={`au-tab${mode === k ? ' active' : ''}`} onClick={() => go(k)}><Icon name={ic} /> {label}</button>
            ))}
          </div>
        )}

        <form id="au-form" className="au-form" key={mode} onSubmit={submit} noValidate role={tabs ? 'tabpanel' : undefined} aria-labelledby={tabs ? `tab-${mode}` : undefined}>
          <h2>{title}</h2>
          <p className="au-sub">{subtitle}</p>
          {info && <div className="au-alert info" role="status"><Icon name="fa-circle-info" /> <span>{info}</span></div>}

          {mode === 'up' && <TextField {...common('fullName')} label="Full name" icon="fa-user" placeholder="Enter your full name" autoComplete="name" maxLength={80} />}
          {['in', 'up', 'forgot'].includes(mode) && <TextField {...common('email')} label={mode === 'in' ? 'Email address' : 'Email'} icon="fa-envelope" type="email" placeholder="you@example.com" autoComplete="email" inputMode="email" />}
          {(mode === 'verify' || mode === 'reset') && (
            <TextField {...common('code')} label="One-time code" icon="fa-key" wrapClass="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={OTP_LENGTH} placeholder={'•'.repeat(OTP_LENGTH)} />
          )}
          {['in', 'up', 'reset'].includes(mode) && (
            <PasswordField {...common('password')} label={mode === 'reset' ? 'New password' : 'Password'} placeholder={mode === 'in' ? 'Password' : 'Create a password'} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
          )}
          {(mode === 'up' || mode === 'reset') && <PasswordStrength value={form.password} />}
          {(mode === 'up' || mode === 'reset') && <PasswordField {...common('confirm')} label="Confirm password" placeholder="Confirm your password" autoComplete="new-password" />}

          {mode === 'in' && (
            <div className="au-row">
              <label className="au-check"><input type="checkbox" checked={form.remember} onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))} disabled={busy} /><span>Remember me</span></label>
              <button type="button" className="au-link" onClick={() => go('forgot')}>Forgot password?</button>
            </div>
          )}

          {formError && <div className="au-alert error" role="alert"><Icon name="fa-triangle-exclamation" /> <span>{formError}</span></div>}

          <button className="au-btn" type="submit" disabled={busy || !filled} aria-busy={busy}>
            {busy ? <><span className="au-spin" aria-hidden="true" /> Please wait…</> : <>{SUBMIT[mode]} {mode === 'in' && <Icon name="fa-arrow-right" />}</>}
          </button>

          {(mode === 'verify' || mode === 'reset') && (
            <button type="button" className="au-link center" disabled={cooldown > 0 || busy} onClick={resend}>{cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}</button>
          )}
        </form>

        <div className="au-foot">
          {mode === 'in' && <><span className="au-or">or</span><p>Don&apos;t have an account? <button type="button" className="au-link" onClick={() => go('up')}>Create one</button></p></>}
          {mode === 'up' && <p>Already have an account? <button type="button" className="au-link" onClick={() => go('in')}>Sign in</button></p>}
          {['verify', 'forgot', 'reset'].includes(mode) && <p><button type="button" className="au-link" onClick={() => go('in')}><Icon name="fa-arrow-left" /> Back to sign in</button></p>}
          {mode === 'up' && <p className="au-fine">If you did not request this, nothing happens: no account is active until you enter the code we email.</p>}
        </div>
      </div>
    </AuthLayout>
  )
}
