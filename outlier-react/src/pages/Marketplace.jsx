import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import * as tasksApi from '../services/tasks'
import * as assignmentsApi from '../services/assignments'
import * as applicationsApi from '../services/applications'
import { DIFFICULTIES, projectStatusFor } from '../utils/status'
import { EmptyState, Loaded, PageHeader } from '../components/ui'
import TaskCard from '../components/TaskCard'

const PAGE = 24
const SORTS = { new: 'Newest', high: 'Highest paying', low: 'Lowest paying', total: 'Highest total earnings' }
const total = (t) => t.hourlyRate * t.estimatedHours

export default function Marketplace() {
  const [params, setParams] = useSearchParams()
  const [shown, setShown] = useState(PAGE)
  const query = useAsync(async () => {
    const [tasks, categories, assignments, applications] = await Promise.all([tasksApi.listTasks(), tasksApi.listCategories(), assignmentsApi.listMine(), applicationsApi.listMine()])
    return { tasks: tasks.filter(tasksApi.isOpenListing), categories, assignments, applications }
  }, [], { refreshOnFocus: true })

  const f = { q: params.get('q') || '', cat: params.get('cat') || '', diff: (params.get('diff') || '').split(',').filter(Boolean), min: params.get('min') || '', max: params.get('max') || '', skill: params.get('skill') || '', sort: params.get('sort') || 'new' }
  const update = (patch) => {
    const next = { ...f, ...patch }
    const p = new URLSearchParams()
    if (next.q) p.set('q', next.q)
    if (next.cat) p.set('cat', next.cat)
    if (next.diff.length) p.set('diff', next.diff.join(','))
    if (next.min) p.set('min', next.min)
    if (next.max) p.set('max', next.max)
    if (next.skill) p.set('skill', next.skill)
    if (next.sort !== 'new') p.set('sort', next.sort)
    setParams(p, { replace: true })
    setShown(PAGE)
  }

  const results = useMemo(() => {
    if (!query.data) return []
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean)
    const lo = f.min === '' ? 0 : Number(f.min), hi = f.max === '' ? Infinity : Number(f.max), sk = f.skill.toLowerCase()
    const catName = (id) => query.data.categories.find((c) => c.id === id)?.name || ''
    const sorters = {
      new: (a, b) => b.postedAt.localeCompare(a.postedAt) || a.title.localeCompare(b.title),
      high: (a, b) => b.hourlyRate - a.hourlyRate, low: (a, b) => a.hourlyRate - b.hourlyRate, total: (a, b) => total(b) - total(a),
    }
    return query.data.tasks
      .filter((t) => {
        const hay = `${t.title} ${t.summary} ${t.skills.join(' ')} ${catName(t.categoryId)}`.toLowerCase()
        return words.every((w) => hay.includes(w)) && (!f.cat || t.categoryId === f.cat) && (!f.diff.length || f.diff.includes(t.difficulty))
          && t.hourlyRate >= lo && t.hourlyRate <= hi && (!sk || t.skills.some((s) => s.toLowerCase().includes(sk)))
      })
      .sort(sorters[f.sort] || sorters.new)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, params])

  return (
    <>
      <PageHeader title="Project Marketplace">Find projects that match your skills, then apply.</PageHeader>
      <Loaded query={query}>
        {(d) => {
          const skills = [...new Set(d.tasks.flatMap((t) => t.skills))].sort((a, b) => a.localeCompare(b))
          return (
            <>
              <section className="filters">
                <div className="filter-row">
                  <input id="q" type="search" placeholder="Search projects, skills or keywords…" aria-label="Search projects" defaultValue={f.q} onChange={(e) => update({ q: e.target.value.trim() })} />
                  <select aria-label="Category" value={f.cat} onChange={(e) => update({ cat: e.target.value })}>
                    <option value="">All categories</option>
                    {d.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select aria-label="Sort" value={f.sort} onChange={(e) => update({ sort: e.target.value })}>
                    {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="filter-row">
                  <input list="skills" placeholder="Any skill" aria-label="Required skill" defaultValue={f.skill} onChange={(e) => update({ skill: e.target.value.trim() })} />
                  <datalist id="skills">{skills.map((s) => <option key={s} value={s} />)}</datalist>
                  <input type="number" min="10" max="200" placeholder="Min $/hr" aria-label="Minimum hourly rate" value={f.min} onChange={(e) => update({ min: e.target.value })} />
                  <input type="number" min="10" max="200" placeholder="Max $/hr" aria-label="Maximum hourly rate" value={f.max} onChange={(e) => update({ max: e.target.value })} />
                  <button className="btn secondary" type="button" onClick={() => { setParams({}, { replace: true }); setShown(PAGE) }}>Clear filters</button>
                </div>
                <div className="diff-filter" role="group" aria-label="Difficulty">
                  {DIFFICULTIES.map((x) => (
                    <button key={x} type="button" className={`diff-chip diff-${x.toLowerCase()}`} aria-pressed={f.diff.includes(x)}
                      onClick={() => update({ diff: f.diff.includes(x) ? f.diff.filter((y) => y !== x) : [...f.diff, x] })}>{x}</button>
                  ))}
                </div>
              </section>
              <p className="muted" aria-live="polite">{results.length ? `Showing ${Math.min(shown, results.length)} of ${results.length} projects` : ''}</p>
              <div className="task-grid">
                {results.length ? results.slice(0, shown).map((t) => (
                  <TaskCard key={t.id} task={t} category={d.categories.find((c) => c.id === t.categoryId)} status={projectStatusFor(t.id, d.assignments, d.applications)} />
                )) : <EmptyState icon="fa-magnifying-glass" title="No projects match your filters">Try removing a filter or searching for something broader.</EmptyState>}
              </div>
              {results.length > shown && <div className="center"><button className="btn secondary" onClick={() => setShown((n) => n + PAGE)}>Load more</button></div>}
              <p className="credit muted">Photography via <a href="https://unsplash.com/?utm_source=outlier&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a>.</p>
            </>
          )
        }}
      </Loaded>
    </>
  )
}
