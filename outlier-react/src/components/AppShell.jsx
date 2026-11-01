import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Icon } from './ui'
import TimerBadge from './TimerBadge'
import NotificationBell from './NotificationBell'

const MEMBER_NAV = [
  ['/dashboard', 'fa-house', 'Dashboard'],
  ['/marketplace', 'fa-store', 'Marketplace', true],
  ['/projects', 'fa-clipboard-list', 'My Projects', true],
  ['/earnings', 'fa-money-check-dollar', 'Earnings', true],
  ['/payout', 'fa-building-columns', 'Payment Settings', true],
  ['/learn', 'fa-chalkboard', 'Learn Skills'],
  ['/account', 'fa-user', 'Account'],
]

export default function AppShell() {
  const { profile, user, isAdmin, isApproved, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const items = MEMBER_NAV.filter(([, , , needsApproval]) => !needsApproval || isApproved || isAdmin)
  if (isAdmin) items.push(['/admin', 'fa-user-shield', 'Admin'])
  const name = profile?.displayName || ''

  return (
    <div className={`container${open ? ' nav-open' : ''}`}>
      <aside className="sidebar" id="sidebar">
        <img src="/images/outlier.png" alt="Outlier" className="logo" />
        <nav aria-label="Main">
          <ul>
            {items.map(([to, icon, label]) => (
              <li key={to}>
                <NavLink to={to} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
                  <Icon name={icon} /> <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="content-col">
        <div className="topbar">
          <button className="icon-btn burger" aria-label="Toggle menu" aria-controls="sidebar" onClick={() => setOpen((o) => !o)}><Icon name="fa-bars" /></button>
          <div className="topbar-right">
            {(isApproved || isAdmin) && <TimerBadge userId={user?.id} />}
            <NotificationBell userId={user?.id} />
            <span className="user-btn" title="Your registered name">
              <span className="avatar">{name.trim().charAt(0).toUpperCase()}</span>
              <span className="user-name">{name}</span>
            </span>
            <button className="btn secondary" onClick={async () => { await signOut(); navigate('/', { replace: true }) }}>Sign out</button>
          </div>
        </div>
        <main className="main-content" id="main"><div key={location.pathname} className="page-enter"><Outlet /></div></main>
      </div>
      {open && <button className="nav-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
    </div>
  )
}
