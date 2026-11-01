import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import * as earningsApi from '../../services/earnings'
import { fmtDateTime } from '../../utils/format'
import { Loaded } from '../../components/ui'

const FIELDS = [
  ['Payments', [['cutoff_days_before_payment', 'Earnings cutoff: days before the payment date', 'number'], ['approval_deadline_days_before_payment', 'Payment approval deadline: days before the payment date', 'number']]],
  ['Time tracking', [['inactivity_pause_minutes', 'Pause the timer after this many idle minutes (browser)', 'number'], ['inactivity_grace_seconds', 'Server stops counting this many seconds after the last heartbeat', 'number']]],
  ['Reminders', [['reminder_unstarted_hours', 'Remind if assigned but not started after (hours)', 'number'], ['reminder_inactive_hours', 'Remind if in progress with no activity for (hours)', 'number'], ['reminder_deadline_days', 'Remind when a deadline is within (days)', 'number'], ['reminder_min_gap_hours', 'Minimum gap between reminders for one project (hours)', 'number'], ['reminder_max_per_project', 'Maximum reminders per project', 'number']]],
  ['Email', [['app_url', 'Site address used in email links', 'text'], ['support_email', 'Support email shown in emails', 'text']]],
]
const STATUS_CLASS = { sent: 'status-approved', queued: 'status-pending', sending: 'status-pending', failed: 'status-rejected', dead: 'status-rejected' }

export default function AdminSettings() {
  const toast = useToast()
  const query = useAsync(async () => ({ settings: Object.fromEntries((await earningsApi.listSettings()).map((s) => [s.key, s.value])), outbox: await earningsApi.listOutbox(), errors: await earningsApi.listSystemErrors().catch(() => []) }), [], { refreshOnFocus: true })
  const [busy, setBusy] = useState('')
  async function save(key, value) {
    setBusy(key)
    try { await earningsApi.setSetting(key, value); toast.success('Setting saved.'); query.reload() } catch (e) { toast.error(e.message) } finally { setBusy('') }
  }
  return (
    <Loaded query={query}>
      {({ settings, outbox, errors }) => (
        <>
          {FIELDS.map(([group, rows]) => (
            <section className="panel" key={group}><h2>{group}</h2>
              {rows.map(([key, label, type]) => (
                <form key={key} className="setting-row" onSubmit={(e) => { e.preventDefault(); save(key, new FormData(e.target).get('v')) }}>
                  <label htmlFor={key}>{label}</label>
                  <input id={key} name="v" type={type} min={type === 'number' ? 0 : undefined} defaultValue={settings[key] ?? ''} key={settings[key]} />
                  <button className="btn secondary" disabled={busy === key}>Save</button>
                </form>
              ))}
            </section>
          ))}
          <section className="panel"><h2>Scheduled jobs</h2>
            <p className="muted">Reminders and weekly/monthly statements run automatically when the schedule from <code>supabase/schedule.sql</code> is installed. You can also run them now.</p>
            <button className="btn" disabled={busy === 'jobs'} onClick={async () => { setBusy('jobs'); try { const r = await earningsApi.runJobs(); toast.success(`Reminders queued: ${r.reminders}. Statements queued: ${r.statements}.`); query.reload() } catch (e) { toast.error(e.message) } finally { setBusy('') } }}>Run scheduled jobs now</button>
          </section>
          <section className="panel"><h2>Notification errors ({errors.length})</h2>
            <p className="muted small">If a database event could not queue its notification or email, the reason is recorded here instead of being lost.</p>
            {errors.length ? <ul className="mini-list">{errors.map((x) => <li key={x.id}><span><b>{x.context}</b>: {x.message}</span><span className="muted small">{fmtDateTime(x.at)}</span></li>)}</ul> : <p className="muted">None recorded.</p>}
          </section>
          <section><h2>Email delivery log</h2>
            <p className="muted small">Emails are queued only after the real event happened, de-duplicated, and sent through Resend by the send-emails function. Nothing is sent until that function and its secrets are deployed.</p>
            {outbox.length ? <div className="table-wrap"><table><thead><tr>{['When', 'To', 'Type', 'Status', 'Delivery', 'Tries', 'Error'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
              <tbody>{outbox.map((m) => <tr key={m.id}><td>{fmtDateTime(m.createdAt)}</td><td>{m.toEmail}</td><td>{m.type}</td><td><span className={`status ${STATUS_CLASS[m.status]}`}>{m.status}</span></td><td>{m.deliveryStatus || '—'}</td><td>{m.attempts}</td><td className="small">{m.lastError || ''}</td></tr>)}</tbody></table></div>
              : <p className="muted">No emails queued yet.</p>}
          </section>
        </>
      )}
    </Loaded>
  )
}
