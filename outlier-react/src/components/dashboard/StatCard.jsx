import LIcon from '../LIcon'

/** KPI tile. `trend` ({ change, label }) is drawn only when there is a real earlier period to compare with. */
export default function StatCard({ icon, tone = 'blue', label, children, hint, trend }) {
  const showTrend = trend && trend.change != null
  const up = showTrend && trend.change >= 0
  return (
    <article className={`dx-stat tone-${tone}`}>
      <div className="dx-stat-top">
        <span className="dx-stat-icon"><LIcon name={icon} size={20} /></span>
        {showTrend && (
          <span className={`dx-trend ${up ? 'up' : 'down'}`} title={trend.label}>
            <LIcon name={up ? 'up' : 'down'} size={14} />{up ? '+' : ''}{trend.change}%
          </span>
        )}
      </div>
      <p className="dx-stat-label">{label}</p>
      <p className="dx-stat-value">{children}</p>
      {(hint || showTrend) && <p className="dx-stat-hint">{showTrend && <b>{trend.label}</b>}{showTrend && hint ? ' · ' : ''}{hint}</p>}
    </article>
  )
}
