import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useProfiles } from '../../hooks/useNames'
import { useToast } from '../../context/ToastContext'
import * as applicationsApi from '../../services/applications'
import * as tasksApi from '../../services/tasks'
import { APPLICATION_STATUS } from '../../utils/status'
import { fmtDate, money } from '../../utils/format'
import { EmptyState, Loaded, StatusPill } from '../../components/ui'
import FormDialog from '../../components/FormDialog'

export default function AdminApplications() {
  const toast = useToast()
  const { nameOf } = useProfiles()
  const [filter, setFilter] = useState('open')
  const [reviewing, setReviewing] = useState(null)
  const query = useAsync(async () => ({ apps: await applicationsApi.listAll(), tasks: await tasksApi.listTasks() }), [], { refreshOnFocus: true })

  return (
    <Loaded query={query}>
      {({ apps, tasks }) => {
        const rows = apps.filter((a) => filter === 'all' || (filter === 'open' ? ['submitted', 'reviewing'].includes(a.status) : a.status === filter))
        return (
          <>
            <div className="toolbar">
              <select aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="open">Needs review</option><option value="all">All</option>
                {Object.entries(APPLICATION_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            {rows.length ? rows.map((a) => {
              const t = tasks.find((x) => x.id === a.taskId)
              return (
                <div className="row-card app-row" key={a.id}>
                  <div className="grow">
                    <h3>{a.tasks?.title}</h3>
                    <p>{nameOf(a.userId)} · {fmtDate(a.createdAt)} · {a.availability}{a.proposedRate ? ` · proposes ${money(a.proposedRate)}/hr${t ? ` (listed ${money(t.hourlyRate)})` : ''}` : ''}</p>
                    <p className="note">{a.note}</p>
                    {a.reviewerNote && <p className="note">Your note: {a.reviewerNote}</p>}
                  </div>
                  <StatusPill kind="application" value={a.status} />
                  {a.status !== 'withdrawn' && <button className="btn" onClick={() => setReviewing({ a, t })}>Review</button>}
                </div>
              )
            }) : <EmptyState icon="fa-inbox" title="Nothing here">No applications match this filter.</EmptyState>}
            {reviewing && (
              <FormDialog title="Review application" intro={`${reviewing.a.tasks?.title}: “${reviewing.a.note}”`} confirmLabel="Save decision" onClose={() => setReviewing(null)}
                initial={{ status: reviewing.a.status === 'submitted' ? 'reviewing' : reviewing.a.status, rate: reviewing.a.agreedRate || reviewing.a.proposedRate || reviewing.t?.hourlyRate || '', note: reviewing.a.reviewerNote }}
                fields={[
                  { name: 'status', label: 'Decision', type: 'select', options: [{ value: 'reviewing', label: 'Under review' }, { value: 'accepted', label: 'Approve (tasker can start working)' }, { value: 'rejected', label: 'Reject' }] },
                  { name: 'rate', label: 'Agreed hourly rate (USD) – used when approving', type: 'number', min: 10, max: 200, step: 1, hint: 'Earnings are approved hours × this rate.' },
                  { name: 'note', label: 'Note to applicant (optional)', type: 'textarea', maxLength: 300 },
                ]}
                validate={(d) => ({ rate: d.status === 'accepted' && !(Number.isInteger(Number(d.rate)) && Number(d.rate) >= 10 && Number(d.rate) <= 200) ? 'Enter a whole number from 10 to 200.' : '' })}
                onSubmit={async (d) => { await applicationsApi.review(reviewing.a.id, { status: d.status, reviewerNote: d.note, agreedRate: d.status === 'accepted' ? Number(d.rate) : null }); toast.success(d.status === 'accepted' ? 'Application approved. The project is now assigned.' : 'Decision saved.'); query.reload() }} />
            )}
          </>
        )
      }}
    </Loaded>
  )
}
