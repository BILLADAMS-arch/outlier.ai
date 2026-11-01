import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '../../components/ui'

const TABS = [['taskers', 'Taskers'], ['tasks', 'Projects'], ['categories', 'Categories'], ['applications', 'Applications'], ['work', 'Work & Hours'], ['payments', 'Payments'], ['earnings', 'Earnings'], ['payout-accounts', 'Payment Accounts'], ['settings', 'Settings']]

export default function AdminLayout() {
  return (
    <>
      <PageHeader title="Administration">Approve accounts, assign projects, review work and approve payments.</PageHeader>
      <nav className="subnav" aria-label="Admin sections">
        {TABS.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>)}
      </nav>
      <Outlet />
    </>
  )
}
