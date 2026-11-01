import { PROJECT_STATUS, ACCOUNT_STATUS, APPLICATION_STATUS, PAYMENT_STATUS, BANK_STATUS } from '../utils/status'

export const Icon = ({ name, className = '' }) => <i className={`${name.includes('fa-brands') ? '' : 'fa-solid '}${name} ${className}`} aria-hidden="true" />

export const Spinner = ({ label = 'Loading' }) => <div className="spinner" role="status" aria-label={label} />

/** Shimmering placeholders shown while a page's data loads. */
export const Skeleton = () => (
  <div className="skel-wrap" role="status" aria-label="Loading">
    <div className="skel title" />
    <div className="skel card" /><div className="skel row" /><div className="skel row" />
  </div>
)

export function EmptyState({ icon = 'fa-folder-open', title, children, action }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty" role="alert">
      <Icon name="fa-triangle-exclamation" />
      <h3>Something went wrong</h3>
      <p>{error?.message || 'The page could not be loaded.'}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
    </div>
  )
}

/** Shows a spinner, error or the children once `query` (from useAsync) has loaded. */
export function Loaded({ query, children }) {
  if (query.loading) return <Skeleton />
  if (query.error) return <ErrorState error={query.error} onRetry={query.reload} />
  return children(query.data)
}

export function PageHeader({ title, children, actions }) {
  return (
    <header className="page-header between">
      <div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions}
    </header>
  )
}

const LABELS = { project: PROJECT_STATUS, account: ACCOUNT_STATUS, application: APPLICATION_STATUS, payment: PAYMENT_STATUS, bank: BANK_STATUS }
export function StatusPill({ kind = 'project', value }) {
  const label = LABELS[kind]?.[value] ?? value
  const cls = kind === 'payment' ? `pay-${value}` : `status-${value}`
  return <span className={`status ${cls}`}>{label}</span>
}

export const DifficultyBadge = ({ level }) => <span className={`diff diff-${level.toLowerCase()}`}>{level}</span>
