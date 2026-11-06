import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import * as promoApi from '../../services/promo'
import { Loaded } from '../../components/ui'
import { fmtDateTime } from '../../utils/format'

const todayId = () => `projects-${new Date().toISOString().slice(0, 10)}`

/** Sends the "available projects" promotional email: first to yourself as a test, then to everyone who has not opted out. */
export default function AdminAnnouncements() {
  const toast = useToast()
  const query = useAsync(async () => ({ audience: await promoApi.audience(), address: await promoApi.getAddress(), ongoing: await promoApi.reminderAudience() }), [])
  const [days, setDays] = useState(30)
  const [mode, setMode] = useState('inactive')
  const inactive = useAsync(() => promoApi.inactiveAudience(Math.max(Number(days) || 30, 1), mode), [days, mode])
  const [inTested, setInTested] = useState(false)
  const [inCampaign, setInCampaign] = useState(`inactive-${new Date().toISOString().slice(0, 10)}`)
  const [remTested, setRemTested] = useState(false)
  const [remCampaign, setRemCampaign] = useState(`continue-${new Date().toISOString().slice(0, 10)}`)
  const [subject, setSubject] = useState('New projects are open: apply today')
  const [campaign, setCampaign] = useState(todayId())
  const [address, setAddress] = useState(null)
  const [busy, setBusy] = useState(false)
  const [tested, setTested] = useState(false)
  const run = async (fn, ok) => { setBusy(true); try { const r = await fn(); toast.success(ok(r)); query.reload(); inactive.reload() } catch (e) { toast.error(e.message) } finally { setBusy(false) } }

  return (
    <Loaded query={query}>
      {({ audience, address: saved, ongoing }) => {
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
            <section className="panel">
              <h2>Reminder: continue your ongoing work</h2>
              <p className="muted">Sends each tasker with a project in progress an in-app notification and an email with a Continue working button, showing their progress and last save. This is an account email, so it is sent even to people who opted out of promotions.</p>
              {ongoing.length ? (
                <div className="table-wrap"><table>
                  <thead><tr>{['Tasker', 'Email', 'Project', 'Progress', 'Last activity'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                  <tbody>{ongoing.map((o) => <tr key={o.assignmentId}><td>{o.name}</td><td>{o.email}</td><td>{o.project}</td><td>{o.progress == null ? '—' : `${o.progress}%`}</td><td>{o.lastActivity ? fmtDateTime(o.lastActivity) : 'Not started'}</td></tr>)}</tbody>
                </table></div>
              ) : <p className="muted">Nobody has a project in progress.</p>}
              <div className="toolbar">
                <input aria-label="Reminder campaign id" value={remCampaign} onChange={(e) => setRemCampaign(e.target.value)} title="Sending the same campaign id twice never reminds the same project twice" />
                <button className="btn secondary" disabled={busy || !remCampaign.trim()} onClick={() => run(() => promoApi.queueReminders(remCampaign, true), (r) => { setRemTested(true); return `Test reminder queued for ${r.queued} of your own projects.` })}>Send a test to me</button>
                <button className="btn" disabled={busy || !remTested || !ongoing.length}
                  onClick={() => { if (window.confirm(`Send a continue-working reminder to ${ongoing.length} ongoing projects now? This cannot be undone.`)) run(() => promoApi.queueReminders(remCampaign, false), (r) => `${r.queued} reminders queued for delivery.`) }}>
                  Send to {ongoing.length} ongoing projects
                </button>
              </div>
            </section>
            <section className="panel">
              <h2>Notice: inactive accounts</h2>
              <p className="muted">Warns accounts with no sign-in and no logged work for the chosen number of days that inactive accounts can be suspended or terminated, including where inactivity raises a suspected fraud concern. It does not say the person is suspected of fraud. This is an account notice, so it is sent even to people who opted out of promotions. Only send it if your terms or policy actually allow suspension for inactivity.</p>
              <div className="toolbar">
                <select aria-label="Who is inactive" value={mode} onChange={(e) => { setMode(e.target.value); setInTested(false) }}>
                  <option value="inactive">No sign-in or work for a number of days</option>
                  <option value="never_worked">Signed in, but never logged any work</option>
                </select>
                {mode === 'inactive' && <label>at least <input type="number" min="1" aria-label="Inactive days" value={days} onChange={(e) => { setDays(e.target.value); setInTested(false) }} style={{ width: 70 }} /> days</label>}
              </div>
              <Loaded query={inactive}>
                {(list) => (
                  <>
                    {list.length ? (
                      <div className="table-wrap"><table>
                        <thead><tr>{['Name', 'Email', mode === 'never_worked' ? 'Last sign-in' : 'Last activity', 'Days ago'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                        <tbody>{list.map((o) => <tr key={o.userId}><td>{o.name}</td><td>{o.email}</td><td>{fmtDateTime(o.lastActive)}</td><td>{o.days}</td></tr>)}</tbody>
                      </table></div>
                    ) : <p className="muted">No accounts have been inactive that long.</p>}
                    <div className="toolbar">
                      <input aria-label="Inactivity campaign id" value={inCampaign} onChange={(e) => setInCampaign(e.target.value)} title="Sending the same campaign id twice never emails the same person twice" />
                      <button className="btn secondary" disabled={busy || !inCampaign.trim()} onClick={() => run(() => promoApi.queueInactivity(inCampaign, Number(days) || 30, true, mode), () => { setInTested(true); return 'Test notice queued to your own address.' })}>Send a test to me</button>
                      <button className="btn" disabled={busy || !inTested || !list.length}
                        onClick={() => { if (window.confirm(`Send the inactivity notice to ${list.length} accounts now? This cannot be undone.`)) run(() => promoApi.queueInactivity(inCampaign, Number(days) || 30, false, mode), (r) => `${r.queued} notices queued for delivery.`) }}>
                        Send to {list.length} inactive accounts
                      </button>
                    </div>
                  </>
                )}
              </Loaded>
            </section>
          </>
        )
      }}
    </Loaded>
  )
}
