import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { initials } from '../../utils/format'
import LIcon from '../LIcon'

/** Avatar button with a dropdown: who is signed in, shortcuts, and Sign out. */
export default function UserMenu() {
  const { profile, user, isAdmin, isApproved, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const box = useRef(null)
  const navigate = useNavigate()
  const name = profile?.displayName || user?.email || 'Account'

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  async function logout() {
    setBusy(true)
    try { await signOut() } finally { setBusy(false) }
    navigate('/', { replace: true })
  }
  return (
    <div className="sh-pop" ref={box}>
      <button type="button" className="sh-user" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="sh-avatar">{initials(name)}</span>
        <span className="sh-user-name">{name}</span>
        <LIcon name="chevDown" size={16} className="sh-chev" />
      </button>
      {open && (
        <div className="sh-menu" role="menu">
          <div className="sh-menu-head">
            <span className="sh-avatar lg">{initials(name)}</span>
            <div><strong>{name}</strong><small>{user?.email}</small><em>{isAdmin ? 'Administrator' : isApproved ? 'Approved tasker' : 'Pending approval'}</em></div>
          </div>
          <Link role="menuitem" to="/account" onClick={() => setOpen(false)}><LIcon name="user" size={16} /> Account</Link>
          {(isApproved || isAdmin) && <Link role="menuitem" to="/payout" onClick={() => setOpen(false)}><LIcon name="landmark" size={16} /> Payment settings</Link>}
          <Link role="menuitem" to="/notifications" onClick={() => setOpen(false)}><LIcon name="bell" size={16} /> Notifications</Link>
          <button type="button" role="menuitem" className="danger" disabled={busy} onClick={logout}><LIcon name="logout" size={16} /> {busy ? 'Signing out…' : 'Sign out'}</button>
        </div>
      )}
    </div>
  )
}
