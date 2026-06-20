function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return Math.round(n).toString()
}

function PeriodRow({ label, tokens, costUSD }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <span className="label">{label}</span>
      <span className="mono val-small" style={{ color: 'var(--text-muted)' }}>
        {fmtNum(tokens)}&nbsp;<span style={{ color: 'var(--text-primary)' }}>${costUSD.toFixed(2)}</span>
      </span>
    </div>
  )
}

export default function Totals({ periodicTotals }) {
  const {
    today = { tokens: 0, costUSD: 0 },
    week  = { tokens: 0, costUSD: 0 },
    month = { tokens: 0, costUSD: 0 },
  } = periodicTotals ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="label" style={{ marginBottom: 12 }}>totals</div>
      <PeriodRow label="today"   tokens={today.tokens} costUSD={today.costUSD} />
      <PeriodRow label="7 days"  tokens={week.tokens}  costUSD={week.costUSD}  />
      <PeriodRow label="30 days" tokens={month.tokens} costUSD={month.costUSD} />
    </div>
  )
}
