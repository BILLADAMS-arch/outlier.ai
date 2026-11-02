import { useState } from 'react'
import { Icon } from '../ui'
import { passwordChecks, passwordStrength } from '../../utils/password'

/** Labelled input with a leading icon, inline error and accessible wiring. */
export function TextField({ id, label, icon, error, hint, wrapClass = '', ...input }) {
  return (
    <div className="au-field">
      <label htmlFor={id}>{label}</label>
      <div className={`au-input${error ? ' bad' : ''} ${wrapClass}`}>
        {icon && <Icon name={icon} />}
        <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={`${id}-msg`} {...input} />
      </div>
      <div className={`au-msg${error ? ' err' : ''}`} id={`${id}-msg`} role={error ? 'alert' : undefined}>{error || hint || ''}</div>
    </div>
  )
}

/** Password input with a show/hide toggle. */
export function PasswordField({ id, label, error, hint, ...input }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="au-field">
      <label htmlFor={id}>{label}</label>
      <div className={`au-input${error ? ' bad' : ''}`}>
        <Icon name="fa-lock" />
        <input id={id} type={shown ? 'text' : 'password'} aria-invalid={error ? 'true' : undefined} aria-describedby={`${id}-msg`} {...input} />
        <button type="button" className="au-eye" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}><Icon name={shown ? 'fa-eye-slash' : 'fa-eye'} /></button>
      </div>
      <div className={`au-msg${error ? ' err' : ''}`} id={`${id}-msg`} role={error ? 'alert' : undefined}>{error || hint || ''}</div>
    </div>
  )
}

/** Live strength bar and requirement checklist for new passwords. */
export function PasswordStrength({ value }) {
  const { score, label } = passwordStrength(value)
  const c = passwordChecks(value)
  return (
    <div className="au-strength" aria-live="polite">
      <div className="au-bars" aria-hidden="true">{[1, 2, 3, 4].map((n) => <span key={n} className={score >= n ? `on s${score}` : ''} />)}</div>
      <div className="au-strength-row">
        <ul className="au-reqs">
          <li className={c.length ? 'ok' : ''}><Icon name={c.length ? 'fa-circle-check' : 'fa-circle'} /> At least 8 characters</li>
          <li className={c.number ? 'ok' : ''}><Icon name={c.number ? 'fa-circle-check' : 'fa-circle'} /> At least one number</li>
        </ul>
        {value && <strong className={`au-strength-label s${score}`}>{label}</strong>}
      </div>
    </div>
  )
}
