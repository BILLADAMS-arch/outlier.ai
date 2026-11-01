import { useNavigate } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import * as notificationsApi from '../services/notifications'
import { fmtDateTime } from '../utils/format'
import { EmptyState, Loaded, PageHeader } from '../components/ui'

export default function Notifications() {
  const query = useAsync(() => notificationsApi.listNotifications(100), [], { refreshOnFocus: true })
  const navigate = useNavigate()
  return (
    <>
      <PageHeader title="Notifications" actions={<button className="btn secondary" onClick={async () => { await notificationsApi.markRead(null); query.reload() }}>Mark all as read</button>}>Everything that happened on your account.</PageHeader>
      <Loaded query={query}>
        {(items) => items.length ? items.map((n) => (
          <button key={n.id} type="button" className={`row-card notif-row${n.readAt ? '' : ' unread'}`} onClick={async () => { if (!n.readAt) await notificationsApi.markRead([n.id]); if (n.link) navigate(n.link); else query.reload() }}>
            <div className="grow"><h3>{n.title}</h3><p>{n.body}</p></div><span className="muted small">{fmtDateTime(n.createdAt)}</span>
          </button>
        )) : <EmptyState icon="fa-bell" title="No notifications yet">Approvals, assignments, reviews and payment updates will appear here.</EmptyState>}
      </Loaded>
    </>
  )
}
