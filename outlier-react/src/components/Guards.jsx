import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ErrorState, Spinner } from './ui'
import NotFound from '../pages/NotFound'

/** Sends visitors who are not signed in to the login page. */
export function RequireAuth() {
  const { session, loading, profileError, signOut } = useAuth()
  const location = useLocation()
  if (loading) return <div className="center-screen"><Spinner /></div>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (profileError) {
    return (
      <div className="center-screen">
        <ErrorState error={profileError} onRetry={() => signOut()} />
      </div>
    )
  }
  return <Outlet />
}

/** Only approved taskers (and admins) may see the marketplace, projects, earnings and payment pages. */
export function RequireApproved() {
  const { isApproved, isAdmin } = useAuth()
  if (!isApproved && !isAdmin) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

/** Admin area. Anyone else sees an ordinary "not found" page so the route is not advertised. */
export function RequireAdmin() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Outlet /> : <NotFound />
}
