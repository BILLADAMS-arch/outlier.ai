import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as promoApi from '../services/promo'
import { fmtDate } from '../utils/format'
import { PageHeader, StatusPill } from '../components/ui'

export default function Account() {
  const { profile, user, refreshProfile } = useAuth()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  async function toggle(optOut) {
    setSaving(true)
    try { await promoApi.setOptOut(optOut); await refreshProfile(); toast.success(optOut ? 'You will no longer get promotional emails.' : 'Promotional emails are on.') } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }
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
      <div className="panel">
        <h2>Email preferences</h2>
        <label className="check"><input type="checkbox" checked={!profile.marketingOptOut} disabled={saving} onChange={(e) => toggle(!e.target.checked)} /><span>Send me emails about new and open projects</span></label>
        <p className="muted">Account emails (sign-in codes, approvals, work and payment updates, statements) are always sent.</p>
      </div>
    </>
  )
}
