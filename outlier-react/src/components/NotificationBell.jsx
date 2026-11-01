import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as notificationsApi from '../services/notifications'
import { fmtDateTime } from '../utils/format'
import { Icon } from './ui'

/** In-app notification centre: polls while the page is open and when the tab regains focus. */
export default function NotificationBell({ userId }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const navigate = useNavigate()

  const load = useCallback(() => notificationsApi.listNotifications(15).then(setItems, () => {}), [])
  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [load, userId])
  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const unread = items.filter((n) => !n.readAt).length
  async function openItem(n) {
    setOpen(false)
    if (!n.readAt) { await notificationsApi.markRead([n.id]).catch(() => {}); load() }
    if (n.link) navigate(n.link)
  }
  return (
    <div className="pop-wrap" ref={box}>
      <button className="icon-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="fa-bell" />{unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="popover">
          <div className="popover-head"><strong>Notifications</strong>{unread > 0 && <button className="link-btn" onClick={async () => { await notificationsApi.markRead(null); load() }}>Mark all read</button>}</div>
          {items.length ? (
            <ul>{items.map((n) => (
              <li key={n.id} className={n.readAt ? '' : 'unread'}><button type="button" className="notif" onClick={() => openItem(n)}><b>{n.title}</b>{n.body && <span>{n.body}</span>}<small>{fmtDateTime(n.createdAt)}</small></button></li>
            ))}</ul>
          ) : <p className="muted pad">You&apos;re all caught up.</p>}
          <div className="popover-foot"><Link to="/notifications" onClick={() => setOpen(false)}>View all</Link></div>
        </div>
      )}
    </div>
  )
}
