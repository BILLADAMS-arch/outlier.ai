import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import * as promoApi from '../../services/promo'
import { Loaded } from '../../components/ui'

const todayId = () => `projects-${new Date().toISOString().slice(0, 10)}`

/** Sends the "available projects" promotional email: first to yourself as a test, then to everyone who has not opted out. */
export default function AdminAnnouncements() {
  const toast = useToast()
  const query = useAsync(async () => ({ audience: await promoApi.audience(), address: await promoApi.getAddress() }), [])
  const [subject, setSubject] = useState('New projects are open: apply today')
  const [campaign, setCampaign] = useState(todayId())
  const [address, setAddress] = useState(null)
  const [busy, setBusy] = useState(false)
  const [tested, setTested] = useState(false)
  const run = async (fn, ok) => { setBusy(true); try { const r = await fn(); toast.success(ok(r)); query.reload() } catch (e) { toast.error(e.message) } finally { setBusy(false) } }

  return (
    <Loaded query={query}>
      {({ audience, address: saved }) => {
        const addr = address ?? saved
        return (
          <>
            <section className="panel">
              <h2>Promotional email: available projects</h2>
              <p className="muted">Each recipient gets up to six open projects (the newest, best-paying one from each of six categories), the total number of open projects, and advice to read the brief and apply. Pending accounts get a version that says they can apply once approved.</p>
              <dl className="kv">
                <dt>Will be sent to</dt><dd>{audience.eligible} accounts ({audience.approved} approved)</dd>
                <dt>Opted out</dt><dd>{audience.optedOut}</dd>
                <dt>No email on file</dt><dd>{audience.noEmail}</dd>
              </dl>
            </section>
            <section className="panel">
              <h2>1. Postal address (required)</h2>
              <p className="muted">Promotional email must show a valid postal address and an unsubscribe link (US CAN-SPAM). The unsubscribe link is added automatically.</p>
              <div className="toolbar">
                <input aria-label="Postal address" placeholder="Business name, street, city, state ZIP" value={addr} onChange={(e) => setAddress(e.target.value)} style={{ minWidth: 340 }} />
                <button className="btn secondary" disabled={busy || !addr.trim() || addr === saved} onClick={() => run(() => promoApi.setAddress(addr), () => 'Address saved.')}>Save address</button>
              </div>
            </section>
            <section className="panel">
              <h2>2. Send</h2>
              <div className="toolbar">
                <input aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ minWidth: 320 }} />
                <input aria-label="Campaign id" value={campaign} onChange={(e) => setCampaign(e.target.value)} title="Sending the same campaign id twice never emails the same person twice" />
              </div>
              <div className="toolbar">
                <button className="btn secondary" disabled={busy || !saved || !subject.trim() || !campaign.trim()} onClick={() => run(() => promoApi.queue(campaign, subject, true), () => { setTested(true); return 'Test email queued to your own address.' })}>Send a test to me</button>
                <button className="btn" disabled={busy || !tested || !saved || audience.eligible === 0}
                  onClick={() => { if (window.confirm(`Send this promotional email to ${audience.eligible} accounts now? This cannot be undone.`)) run(() => promoApi.queue(campaign, subject, false), (r) => `${r.queued} emails queued for delivery.`) }}>
                  Send to {audience.eligible} accounts
                </button>
              </div>
              {!saved && <p className="muted">Save the postal address first.</p>}
              {saved && !tested && <p className="muted">Send yourself a test first; the main send unlocks afterwards.</p>}
            </section>
          </>
        )
      }}
    </Loaded>
  )
}
