import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { RequireAdmin, RequireApproved, RequireAuth } from './components/Guards'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import TaskDetails from './pages/TaskDetails'
import MyProjects from './pages/MyProjects'
import Onboarding from './pages/Onboarding'
import Workspace from './pages/Workspace'
import Earnings from './pages/Earnings'
import PaymentSettings from './pages/PaymentSettings'
import Account from './pages/Account'
import Learn from './pages/Learn'
import NotFound from './pages/NotFound'
import AdminLayout from './pages/admin/AdminLayout'
import Taskers from './pages/admin/Taskers'
import AdminTasks from './pages/admin/AdminTasks'
import AdminCategories from './pages/admin/AdminCategories'
import AdminApplications from './pages/admin/AdminApplications'
import AdminWork from './pages/admin/AdminWork'
import AdminPayments from './pages/admin/AdminPayments'
import AdminPayoutAccounts from './pages/admin/AdminPayoutAccounts'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/account" element={<Account />} />
          <Route element={<RequireApproved />}>
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/:taskId" element={<TaskDetails />} />
            <Route path="/projects" element={<MyProjects />} />
            <Route path="/projects/:assignmentId/onboarding" element={<Onboarding />} />
            <Route path="/projects/:assignmentId/work" element={<Workspace />} />
            <Route path="/earnings" element={<Earnings />} />
            <Route path="/payout" element={<PaymentSettings />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="taskers" replace />} />
              <Route path="taskers" element={<Taskers />} />
              <Route path="tasks" element={<AdminTasks />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="work" element={<AdminWork />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="payout-accounts" element={<AdminPayoutAccounts />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
