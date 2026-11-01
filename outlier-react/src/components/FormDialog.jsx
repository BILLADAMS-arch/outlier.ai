import { useEffect, useRef, useState } from 'react'

/**
 * Generic modal form. `fields`: [{ name, label, type, options, hint, placeholder, required, maxLength, min, max, step, autoComplete, inputMode }]
 * `validate(values)` returns { field: message }. `onSubmit(values)` may be async; throw to show an error, and the dialog closes on success.
 */
export default function FormDialog({ title, intro, fields = [], initial = {}, validate, onSubmit, onClose, confirmLabel = 'Save', danger, wide }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? (f.type === 'checkbox' ? false : f.type === 'file' ? null : f.type === 'select' ? f.options[0]?.value ?? f.options[0] : '')])))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const set = (name, v) => setValues((s) => ({ ...s, [name]: v }))

  async function submit(e) {
    e.preventDefault()
    const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]))
    const problems = {}
    fields.forEach((f) => {
      if (f.required && !clean[f.name]) problems[f.name] = f.requiredMessage || 'This field is required.'
    })
    Object.entries(validate?.(clean) || {}).forEach(([k, m]) => { if (m && !problems[k]) problems[k] = m })
    setErrors(problems)
    setFormError('')
    if (Object.keys(problems).length) return
    setBusy(true)
    try {
      await onSubmit(clean)
      onClose()
    } catch (err) {
      setFormError(err.message || 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <form onSubmit={submit} noValidate>
          {intro && <p className="modal-intro">{intro}</p>}
          {fields.map((f, i) => {
            const id = `f-${f.name}`
            const common = { id, name: f.name, 'aria-invalid': errors[f.name] ? 'true' : undefined, 'aria-describedby': `${id}-err`, ref: i === 0 ? firstRef : undefined }
            let input
            if (f.type === 'select') {
              input = (
                <select {...common} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                  {f.options.map((o) => { const v = o.value ?? o; return <option key={v} value={v}>{o.label ?? o}</option> })}
                </select>
              )
            } else if (f.type === 'textarea') {
              input = <textarea {...common} rows={f.rows || 3} maxLength={f.maxLength || 500} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} />
            } else if (f.type === 'file') {
              input = <input {...common} type="file" accept={f.accept} onChange={(e) => set(f.name, e.target.files[0] || null)} />
            } else if (f.type === 'checkbox') {
              input = <input {...common} type="checkbox" checked={values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
            } else {
              input = (
                <input {...common} type={f.type || 'text'} value={values[f.name]} placeholder={f.placeholder} maxLength={f.maxLength} min={f.min} max={f.max}
                  step={f.step} inputMode={f.inputMode} autoComplete={f.autoComplete || 'off'} onChange={(e) => set(f.name, e.target.value)} />
              )
            }
            return (
              <div key={f.name} className={`field${f.type === 'checkbox' ? ' check' : ''}`}>
                {f.type === 'checkbox' ? <>{input}<label htmlFor={id}>{f.label}</label></> : <><label htmlFor={id}>{f.label}</label>{input}</>}
                {f.hint && <small>{f.hint}</small>}
                <div className="field-error" id={`${id}-err`}>{errors[f.name]}</div>
              </div>
            )
          })}
          {formError && <div className="callout bad" role="alert">{formError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className={`btn${danger ? ' danger' : ''}`} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
