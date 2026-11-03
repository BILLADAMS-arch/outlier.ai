import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import AppShell from './components/AppShell'
import { RequireAdmin, RequireApproved, RequireAuth } from './components/Guards'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import TaskDetails from './pages/TaskDetails'
import MyProjects from './pages/MyProjects'
import Onboarding from './pages/Onboarding'
import WorkspacePage from './pages/WorkspacePage'
import Notifications from './pages/Notifications'
import AdminReview from './pages/admin/AdminReview'
import AdminEarnings from './pages/admin/AdminEarnings'
import AdminSettings from './pages/admin/AdminSettings'
import StatementPage from './pages/StatementPage'
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
import AdminAnnouncements from './pages/admin/AdminAnnouncements'
import Unsubscribe from './pages/Unsubscribe'

function WorkRedirect() {
  const { assignmentId } = useParams()
  return <Navigate to={`/workspace/project/${assignmentId}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route element={<RequireAuth />}>
        <Route element={<RequireApproved />}>
          <Route path="/workspace/project/:assignmentId" element={<WorkspacePage />} />
        </Route>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/account" element={<Account />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route element={<RequireApproved />}>
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/:taskId" element={<TaskDetails />} />
            <Route path="/projects" element={<MyProjects />} />
            <Route path="/projects/:assignmentId/onboarding" element={<Onboarding />} />
            <Route path="/projects/:assignmentId/work" element={<WorkRedirect />} />
            <Route path="/earnings/statements/:kind/:start" element={<StatementPage />} />
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
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="payout-accounts" element={<AdminPayoutAccounts />} />
              <Route path="review/:assignmentId" element={<AdminReview />} />
              <Route path="earnings" element={<AdminEarnings />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
