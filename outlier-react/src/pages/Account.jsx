import { useAuth } from '../context/AuthContext'
import { fmtDate } from '../utils/format'
import { PageHeader, StatusPill } from '../components/ui'

export default function Account() {
  const { profile, user } = useAuth()
  return (
    <>
      <PageHeader title="Account">Your registration details.</PageHeader>
      <div className="panel">
        <dl className="kv">
          <dt>Name</dt><dd>{profile.displayName}</dd>
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>Account status</dt><dd><StatusPill kind="account" value={profile.accountStatus} /></dd>
          <dt>Role</dt><dd>{profile.role === 'admin' ? 'Administrator' : 'Tasker'}</dd>
          <dt>Member since</dt><dd>{fmtDate(profile.createdAt)}</dd>
        </dl>
        <p className="muted">Your name is the one you registered with and can&apos;t be changed here. Contact an administrator if it needs a correction.</p>
      </div>
    </>
  )
}
