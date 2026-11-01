import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import * as assignmentsApi from '../services/assignments'
import * as applicationsApi from '../services/applications'
import * as tasksApi from '../services/tasks'
import { useToast } from '../context/ToastContext'
import { fmtDate } from '../utils/format'
import { EmptyState, Loaded, PageHeader, StatusPill } from '../components/ui'
import ProjectRow from '../components/ProjectRow'

const TABS = [['all', 'All'], ['assigned', 'Assigned'], ['in_progress', 'In Progress'], ['submitted', 'Submitted'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['applications', 'Applications']]

export default function MyProjects() {
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const query = useAsync(async () => {
    const [assignments, applications, categories] = await Promise.all([assignmentsApi.listMine(), applicationsApi.listMine(), tasksApi.listCategories()])
    return { assignments, applications, categories }
  }, [], { refreshOnFocus: true })

  return (
    <>
      <PageHeader title="My Projects">Projects assigned to you, in progress, submitted or completed, and your applications.</PageHeader>
      <Loaded query={query}>
        {(d) => {
          const count = (k) => (k === 'all' ? d.assignments.length : k === 'applications' ? d.applications.length : d.assignments.filter((a) => a.status === k).length)
          const rows = d.assignments.filter((a) => tab === 'all' || a.status === tab)
          return (
            <>
              <div className="tabs wrap">{TABS.map(([k, l]) => <button key={k} className={`tab-link${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l} ({count(k)})</button>)}</div>
              {tab === 'applications' ? (
                d.applications.length ? d.applications.map((a) => (
                  <div className="row-card" key={a.id}>
                    <div className="grow"><h3><Link to={`/marketplace/${a.taskId}`}>{a.tasks?.title || 'Project'}</Link></h3><p>Applied {fmtDate(a.createdAt)} · {a.availability}</p>{a.reviewerNote && <p className="note">Reviewer: {a.reviewerNote}</p>}</div>
                    <StatusPill kind="application" value={a.status} />
                    {(a.status === 'submitted' || a.status === 'reviewing') && <button className="btn secondary" onClick={async () => { try { await applicationsApi.withdraw(a.id); toast.success('Application withdrawn.'); query.reload() } catch (e) { toast.error(e.message) } }}>Withdraw</button>}
                  </div>
                )) : <EmptyState icon="fa-paper-plane" title="No applications yet" action={<Link className="btn" to="/marketplace">Browse projects</Link>}>Apply to a project and track it here.</EmptyState>
              ) : rows.length ? rows.map((a) => <ProjectRow key={a.id} assignment={a} categories={d.categories} />)
                : <EmptyState icon="fa-folder-open" title="Nothing here" action={<Link className="btn" to="/marketplace">Browse projects</Link>}>Projects appear here once they are assigned to you or your application is approved.</EmptyState>}
            </>
          )
        }}
      </Loaded>
    </>
  )
}
