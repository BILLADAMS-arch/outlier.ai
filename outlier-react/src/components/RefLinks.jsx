import LIcon from './LIcon'

/** "Where to refer" (reading) and "Where to work" (tools) links for a project. Renders nothing without links. */
export default function RefLinks({ links = [], compact = false }) {
  if (!links.length) return null
  const group = (kind, title, icon) => {
    const items = links.filter((l) => (l.kind === 'tool' ? 'tool' : 'reference') === kind)
    if (!items.length) return null
    return (
      <div className="ref-group">
        <h3><LIcon name={icon} size={16} /> {title}</h3>
        <ul>{items.map((l) => <li key={l.url + l.title}><a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}<LIcon name="arrow" size={13} /></a></li>)}</ul>
      </div>
    )
  }
  return <div className={`ref-links${compact ? ' compact' : ''}`}>{group('reference', 'Where to refer', 'book')}{group('tool', 'Tools to work with', 'briefcase')}</div>
}
