import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LIcon from './LIcon'
import TimerBadge from './TimerBadge'
import NotificationBell from './NotificationBell'
import UserMenu from './shell/UserMenu'

const MEMBER_NAV = [
  ['/dashboard', 'dashboard', 'Dashboard'],
  ['/marketplace', 'store', 'Marketplace', true],
  ['/projects', 'briefcase', 'My Projects', true],
  ['/earnings', 'wallet', 'Earnings', true],
  ['/payout', 'landmark', 'Payment Settings', true],
  ['/learn', 'book', 'Learn Skills'],
  ['/account', 'user', 'Account'],
]
const KEY = 'outlier.sidebar'

function initialCollapsed() {
  try { const v = localStorage.getItem(KEY); if (v) return v === 'collapsed' } catch { /* storage unavailable */ }
  return typeof window !== 'undefined' && window.innerWidth < 1100
}

export default function AppShell() {
  const { user, isAdmin, isApproved } = useAuth()
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const items = MEMBER_NAV.filter(([, , , needsApproval]) => !needsApproval || isApproved || isAdmin)
  if (isAdmin) items.push(['/admin', 'shield', 'Admin'])

  function toggleCollapsed() {
    setCollapsed((c) => {
      try { localStorage.setItem(KEY, c ? 'expanded' : 'collapsed') } catch { /* ignore */ }
      return !c
    })
  }
  useEffect(() => {
    if (!open) return undefined
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open])

  return (
    <div className={`sh${collapsed ? ' collapsed' : ''}${open ? ' nav-open' : ''}`}>
      <aside className="sh-side" id="sidebar" aria-label="Sidebar">
        <div className="sh-brand">
          <img src="/images/outlier.png" alt="Outlier" className="sh-logo" />
          <span className="sh-mark" aria-hidden="true">O</span>
        </div>
        <nav aria-label="Main">
          <ul>
            {items.map(([to, icon, label]) => (
              <li key={to}>
                <NavLink to={to} onClick={() => setOpen(false)} className={({ isActive }) => `sh-link${isActive ? ' active' : ''}`} title={collapsed ? label : undefined}>
                  <LIcon name={icon} size={19} /><span className="sh-label">{label}</span>
                  <span className="sh-tip" aria-hidden="true">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" className="sh-collapse" onClick={toggleCollapsed} aria-pressed={collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <LIcon name="panel" size={18} /><span className="sh-label">{collapsed ? 'Expand' : 'Collapse'}</span>
        </button>
      </aside>
      <div className="sh-col">
        <header className="sh-top">
          <button type="button" className="sh-icon sh-burger" aria-label="Open menu" aria-controls="sidebar" aria-expanded={open} onClick={() => setOpen((o) => !o)}><LIcon name={open ? 'x' : 'menu'} size={20} /></button>
          <div className="sh-top-right">
            {(isApproved || isAdmin) && <TimerBadge userId={user?.id} />}
            <NotificationBell userId={user?.id} />
            <UserMenu />
          </div>
        </header>
        <main className="sh-main" id="main"><div key={location.pathname} className="page-enter"><Outlet /></div></main>
      </div>
      {open && <button type="button" className="sh-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
    </div>
  )
}
