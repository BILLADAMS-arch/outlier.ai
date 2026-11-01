import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui'

export default function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <EmptyState icon="fa-circle-question" title="Page not found" action={<Link className="btn" to="/">Back to home</Link>}>
          We couldn&apos;t find the page you were looking for.
        </EmptyState>
      </div>
    </div>
  )
}
