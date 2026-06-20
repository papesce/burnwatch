const RANGE_TO_AVG = {
  '1m':  'avg5m',
  '5m':  'avg5m',
  '15m': 'avg15m',
  '1h':  'avg1h',
  '6h':  'avg6h',
  '24h': 'avg24h',
}

const RANGE_LABEL = {
  '1m':  '5m avg',
  '5m':  '5m avg',
  '15m': '15m avg',
  '1h':  '1h avg',
  '6h':  '6h avg',
  '24h': '24h avg',
}

function ProjectionRow({ label, mins, costPerMin, highlight }) {
  const cost = costPerMin * mins
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <span className="label" style={highlight ? { color: 'var(--accent-cyan)' } : {}}>{label}</span>
      <span className="mono" style={{ fontSize: '0.75rem' }}>
        <span style={{ color: highlight ? 'var(--accent-cyan)' : 'var(--accent-amber)' }}>${cost.toFixed(4)}</span>
      </span>
    </div>
  )
}

export default function Estimates({ estimates, burnRate, chartRange = '5m' }) {
  const { avg5m = 0, avg15m = 0, avg1h = 0, avg6h = 0, avg24h = 0 } = estimates ?? {}
  const allAvgs = { avg5m, avg15m, avg1h, avg6h, avg24h }

  const avgKey = RANGE_TO_AVG[chartRange] ?? 'avg5m'
  const rate = allAvgs[avgKey] ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span className="label">estimates</span>
        <span className="mono muted" style={{ fontSize: '0.6rem' }}>based on {RANGE_LABEL[chartRange]}</span>
      </div>

      <ProjectionRow label="next 5 min"  mins={5}  costPerMin={rate} highlight={chartRange === '1m' || chartRange === '5m'} />
      <ProjectionRow label="next 15 min" mins={15} costPerMin={rate} highlight={chartRange === '15m'} />
      <ProjectionRow label="next 1h"  mins={60} costPerMin={rate} highlight={chartRange === '1h'} />

      <ProjectionRow label="next 24h"   mins={1440}  costPerMin={rate} highlight={chartRange === '24h'} />
      <ProjectionRow label="next 7 days" mins={10080} costPerMin={rate} />
      <ProjectionRow label="next month"  mins={43200} costPerMin={rate} />
    </div>
  )
}
