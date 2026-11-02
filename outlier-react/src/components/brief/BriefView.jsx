import { briefSections } from '../../utils/brief'
import { fmtDate } from '../../utils/format'
import LIcon from '../LIcon'
import RefLinks from '../RefLinks'

const KIND_LABEL = { public: 'Public source', illustrative: 'Illustrative data', tasker: 'You source this' }

function Body({ s }) {
  switch (s.kind) {
    case 'text': return <><p className="bv-text">{s.text}</p>{s.bullets?.length > 0 && <ul className="bullets">{s.bullets.map((i) => <li key={i}>{i}</li>)}</ul>}</>
    case 'list': return <ul className="bullets">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
    case 'steps': return <ol className="step-list">{s.items.map((i) => <li key={i}>{i}</li>)}</ol>
    case 'scope': return (
      <div className="bv-scope">
        {s.inScope.length > 0 && <div><h4>In scope</h4><ul className="bullets">{s.inScope.map((i) => <li key={i}>{i}</li>)}</ul></div>}
        {s.outScope.length > 0 && <div><h4>Out of scope</h4><ul className="bullets">{s.outScope.map((i) => <li key={i}>{i}</li>)}</ul></div>}
      </div>
    )
    case 'inputs': return (
      <>
        {s.inputs.length > 0 && (
          <ul className="bv-inputs">
            {s.inputs.map((i) => (
              <li key={i.title}>
                <span className={`bv-kind ${i.kind}`}>{KIND_LABEL[i.kind] || 'Material'}</span>
                <div>{i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer">{i.title}<LIcon name="arrow" size={13} /></a> : <b>{i.title}</b>}{i.note && <p>{i.note}</p>}</div>
              </li>
            ))}
          </ul>
        )}
        {s.caseData && <div className="bv-case"><p><b>Illustrative case-study data.</b> This is invented for the exercise and is not a real company, client or record.</p><pre>{s.caseData}</pre></div>}
      </>
    )
    case 'links': return <RefLinks links={s.links} compact />
    case 'milestones': return (
      <>
        <dl className="kv"><dt>Estimated effort</dt><dd>{s.hours} hours</dd><dt>Project deadline</dt><dd>{s.deadline ? fmtDate(s.deadline) : 'Ongoing'}</dd></dl>
        {s.items.length > 0 && <ol className="step-list">{s.items.map((i) => <li key={i}>{i}</li>)}</ol>}
      </>
    )
    case 'skills': return (
      <>
        {s.experience && <p className="bv-text"><b>Experience:</b> {s.experience}</p>}
        <div className="chips">{s.skills.map((k) => <span className="chip" key={k}>{k}</span>)}</div>
        {s.items.length > 0 && <ul className="bullets">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>}
      </>
    )
    default: return null
  }
}

/**
 * The whole project brief. variant "full" shows every section as a panel (onboarding and the briefing dialog);
 * "side" shows collapsible sections for the workspace sidebar.
 */
export default function BriefView({ task, variant = 'full', openIds = ['overview', 'steps'] }) {
  const sections = briefSections(task)
  if (variant === 'side') {
    return sections.map((s) => (
      <details className="side-section" key={s.id} open={openIds.includes(s.id)}>
        <summary><LIcon name={s.icon} size={15} /> {s.title}</summary>
        <div className="bv-body"><Body s={s} /></div>
      </details>
    ))
  }
  return sections.map((s) => (
    <section className="panel bv-panel" key={s.id} id={`brief-${s.id}`}>
      <h2><LIcon name={s.icon} size={18} /> {s.title}</h2>
      <Body s={s} />
    </section>
  ))
}
