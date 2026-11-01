import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useProfiles } from '../../hooks/useNames'
import { useToast } from '../../context/ToastContext'
import * as profilesApi from '../../services/profiles'
import * as tasksApi from '../../services/tasks'
import * as assignmentsApi from '../../services/assignments'
import { fmtDate, money } from '../../utils/format'
import { EmptyState, Loaded, StatusPill } from '../../components/ui'
import FormDialog from '../../components/FormDialog'

export default function Taskers() {
  const toast = useToast()
  const profiles = useProfiles()
  const tasks = useAsync(tasksApi.listTasks, [])
  const [filter, setFilter] = useState('pending')
  const [dialog, setDialog] = useState(null) // { type, profile }
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); profiles.reload() } catch (e) { toast.error(e.message) } }

  return (
    <Loaded query={profiles}>
      {(all) => {
        const taskers = all.filter((p) => p.role !== 'admin')
        const rows = taskers.filter((p) => filter === 'all' || p.accountStatus === filter)
        const open = (tasks.data || []).filter((t) => t.status !== 'archived')
        return (
          <>
            <div className="toolbar">
              <select aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="pending">Pending approval ({taskers.filter((p) => p.accountStatus === 'pending').length})</option>
                <option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All taskers ({taskers.length})</option>
              </select>
            </div>
            {rows.length ? rows.map((p) => (
              <div className="row-card" key={p.id}>
                <div className="grow"><h3>{p.displayName}</h3><p>{p.email} · registered {fmtDate(p.createdAt)}{p.reviewNote && ` · note: ${p.reviewNote}`}</p></div>
                <StatusPill kind="account" value={p.accountStatus} />
                <div className="inline-actions">
                  {p.accountStatus !== 'approved' && <button className="btn" onClick={() => act(() => profilesApi.reviewAccount(p.id, 'approved', ''), `${p.displayName} approved.`)}>Approve</button>}
                  {p.accountStatus === 'pending' && <button className="btn secondary danger-text" onClick={() => setDialog({ type: 'reject', profile: p })}>Reject</button>}
                  {p.accountStatus === 'approved' && <button className="btn" onClick={() => setDialog({ type: 'assign', profile: p })}>Assign project</button>}
                  {p.accountStatus === 'approved' && <button className="btn secondary danger-text" onClick={() => setDialog({ type: 'reject', profile: p })}>Revoke</button>}
                </div>
              </div>
            )) : <EmptyState icon="fa-user-check" title="No taskers here">No accounts match this filter.</EmptyState>}

            {dialog?.type === 'reject' && (
              <FormDialog title={`Reject ${dialog.profile.displayName}?`} intro="They won't be able to browse projects or work. You can approve them again later." danger confirmLabel="Reject account" onClose={() => setDialog(null)}
                fields={[{ name: 'note', label: 'Reason (shown to the tasker)', type: 'textarea', maxLength: 300 }]}
                onSubmit={async (d) => { await profilesApi.reviewAccount(dialog.profile.id, 'rejected', d.note); toast.success('Account rejected.'); profiles.reload() }} />
            )}
            {dialog?.type === 'assign' && (
              <FormDialog title={`Assign a project to ${dialog.profile.displayName}`} intro="The tasker will see it as Assigned and can start onboarding right away." confirmLabel="Assign project" onClose={() => setDialog(null)}
                fields={[
                  { name: 'taskId', label: 'Project', type: 'select', options: open.map((t) => ({ value: t.id, label: `${t.title} (${money(t.hourlyRate)}/hr)${t.status !== 'published' ? ` – ${t.status}` : ''}` })) },
                  { name: 'rate', label: 'Hourly rate (USD, leave blank for the listed rate)', type: 'number', min: 10, max: 200, step: 1 },
                ]}
                validate={(d) => ({ rate: d.rate !== '' && !(Number.isInteger(Number(d.rate)) && Number(d.rate) >= 10 && Number(d.rate) <= 200) ? 'Enter a whole number from 10 to 200.' : '' })}
                onSubmit={async (d) => { await assignmentsApi.assignTask(dialog.profile.id, d.taskId, d.rate === '' ? null : Number(d.rate)); toast.success('Project assigned.') }} />
            )}
          </>
        )
      }}
    </Loaded>
  )
}
