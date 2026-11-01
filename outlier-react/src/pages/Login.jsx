import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { emailOk, nameProblem, passwordProblem } from '../utils/validation'

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'up' : 'in')
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')

  if (session) return <Navigate to="/dashboard" replace />
  const up = mode === 'up'
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const email = form.email.trim()
    const problems = {}
    if (up && nameProblem(form.fullName)) problems.fullName = nameProblem(form.fullName)
    if (!emailOk(email)) problems.email = 'Enter a valid email address.'
    if (up) {
      if (passwordProblem(form.password)) problems.password = passwordProblem(form.password)
      if (form.confirm !== form.password) problems.confirm = 'Passwords do not match.'
    } else if (!form.password) problems.password = 'Enter your password.'
    setErrors(problems)
    setFormError('')
    if (Object.keys(problems).length) return
    setBusy(true)
    try {
      if (up) {
        const r = await signUp({ fullName: form.fullName, email, password: form.password })
        if (r.needsConfirmation) { setSentTo(email); return }
      } else {
        await signIn({ email, password: form.password })
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const field = (name, label, type, extra = {}) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} type={type} value={form[name]} onChange={set(name)} aria-invalid={errors[name] ? 'true' : undefined} aria-describedby={`${name}-err`} {...extra} />
      <div className="field-error" id={`${name}-err`}>{errors[name]}</div>
    </div>
  )

  return (
    <div className="auth-wrap">
      <Link to="/"><img className="auth-logo" src="/images/outlier.png" alt="Outlier" /></Link>
      <div className="auth-card">
        {sentTo ? (
          <>
            <h1>Check your email</h1>
            <p className="muted">We sent a confirmation link to <b>{sentTo}</b>. Open it, then sign in. After you sign in, an administrator must approve your account before you can browse projects.</p>
            <button className="btn" onClick={() => { setSentTo(''); setMode('in') }}>Go to sign in</button>
          </>
        ) : (
          <>
            <div className="tabs" role="tablist">
              <button type="button" role="tab" aria-selected={!up} className={`tab-link${!up ? ' active' : ''}`} onClick={() => { setMode('in'); setErrors({}); setFormError('') }}>Sign in</button>
              <button type="button" role="tab" aria-selected={up} className={`tab-link${up ? ' active' : ''}`} onClick={() => { setMode('up'); setErrors({}); setFormError('') }}>Create account</button>
            </div>
            <h1>{up ? 'Create your account' : 'Welcome back'}</h1>
            <p className="muted">{up ? 'Your full name becomes your tasker name and cannot be changed later.' : 'Sign in to see your dashboard and projects.'}</p>
            <form onSubmit={submit} noValidate>
              {up && field('fullName', 'Full name', 'text', { autoComplete: 'name', maxLength: 80 })}
              {field('email', 'Email', 'email', { autoComplete: 'email' })}
              {field('password', up ? 'Password (8+ characters, with a number)' : 'Password', 'password', { autoComplete: up ? 'new-password' : 'current-password' })}
              {up && field('confirm', 'Confirm password', 'password', { autoComplete: 'new-password' })}
              {formError && <div className="callout bad" role="alert">{formError}</div>}
              <button className="btn big" type="submit" disabled={busy}>{busy ? 'Please wait…' : up ? 'Create account' : 'Sign in'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
