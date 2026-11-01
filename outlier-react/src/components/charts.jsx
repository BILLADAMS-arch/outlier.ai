// Small dependency-free SVG charts. Values are plain numbers; hover (or focus) shows the exact value.
const PALETTE = ['#2563eb', '#f59e0b', '#16a34a', '#a855f7', '#ef4444', '#0ea5e9']
const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p }

function Frame({ w, h, max, fmt, children, empty }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" preserveAspectRatio="xMidYMid meet">
      {ticks.map((t) => { const y = 14 + (h - 44) * (1 - t / max); return <g key={t}><line x1="48" x2={w - 8} y1={y} y2={y} stroke="#e5e7eb" /><text x="44" y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{fmt(t)}</text></g> })}
      {empty ? <text x={w / 2} y={h / 2} textAnchor="middle" fill="#9ca3af" fontSize="13">No data for this period</text> : children}
    </svg>
  )
}

/** Grouped or stacked bars. data: [{ label, a: n, b: n }], series: [{ key, label, color? }] */
export function BarChart({ data, series, stacked = false, fmt = (n) => String(Math.round(n * 100) / 100), height = 240 }) {
  const w = Math.max(360, 56 + data.length * 44)
  const colors = series.map((s, i) => s.color || PALETTE[i % PALETTE.length])
  const totals = data.map((d) => (stacked ? series.reduce((t, s) => t + (d[s.key] || 0), 0) : Math.max(0, ...series.map((s) => d[s.key] || 0))))
  const max = niceMax(Math.max(0, ...totals))
  const plotH = height - 44, bw = (w - 64) / Math.max(1, data.length)
  return (
    <div className="chart-wrap">
      <div className="chart-scroll"><Frame w={w} h={height} max={max} fmt={fmt} empty={!data.length || totals.every((t) => t === 0)}>
        {data.map((d, i) => {
          const x0 = 52 + i * bw, inner = stacked ? bw * 0.62 : (bw * 0.78) / series.length
          let acc = 0
          return (
            <g key={d.label}>
              {series.map((s, k) => {
                const v = d[s.key] || 0, hh = (v / max) * plotH
                const x = stacked ? x0 + bw * 0.19 : x0 + bw * 0.11 + k * inner
                const y = stacked ? 14 + plotH - ((acc + v) / max) * plotH : 14 + plotH - hh
                if (stacked) acc += v
                return <rect key={s.key} x={x} y={y} width={inner - 2} height={Math.max(0, hh)} rx="3" fill={colors[k]} tabIndex={0}><title>{`${d.label} · ${s.label}: ${fmt(v)}`}</title></rect>
              })}
              <text x={x0 + bw / 2} y={height - 16} textAnchor="middle" fontSize="10" fill="#4b5563">{d.label}</text>
            </g>
          )
        })}
      </Frame></div>
      <Legend series={series} colors={colors} />
    </div>
  )
}

export function LineChart({ data, series, fmt = (n) => String(Math.round(n * 100) / 100), height = 240 }) {
  const w = Math.max(360, 56 + data.length * 52)
  const colors = series.map((s, i) => s.color || PALETTE[i % PALETTE.length])
  const max = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key] || 0))))
  const plotH = height - 44, step = (w - 72) / Math.max(1, data.length - 1)
  const X = (i) => 56 + (data.length === 1 ? (w - 72) / 2 : i * step), Y = (v) => 14 + plotH - (v / max) * plotH
  return (
    <div className="chart-wrap">
      <div className="chart-scroll"><Frame w={w} h={height} max={max} fmt={fmt} empty={!data.length}>
        {series.map((s, k) => (
          <g key={s.key}>
            <polyline fill="none" stroke={colors[k]} strokeWidth="2.5" points={data.map((d, i) => `${X(i)},${Y(d[s.key] || 0)}`).join(' ')} />
            {data.map((d, i) => <circle key={d.label} cx={X(i)} cy={Y(d[s.key] || 0)} r="4" fill={colors[k]} tabIndex={0}><title>{`${d.label} · ${s.label}: ${fmt(d[s.key] || 0)}`}</title></circle>)}
          </g>
        ))}
        {data.map((d, i) => <text key={d.label} x={X(i)} y={height - 16} textAnchor="middle" fontSize="10" fill="#4b5563">{d.label}</text>)}
      </Frame></div>
      <Legend series={series} colors={colors} />
    </div>
  )
}

function Legend({ series, colors }) {
  return <ul className="legend">{series.map((s, i) => <li key={s.key}><span style={{ background: colors[i] }} />{s.label}</li>)}</ul>
}
