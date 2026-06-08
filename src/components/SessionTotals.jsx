import { useState, useEffect, useRef } from 'react'

// Smooth number tween over ~200ms
function useSpringNumber(target, duration = 200) {
  const [display, setDisplay] = useState(target)
  const rafRef  = useRef(null)
  const startRef = useRef({ from: target, to: target, t: 0 })

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    const from = display
    const start = performance.now()
    startRef.current = { from, to: target, start }

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(from + (target - from) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

  return display
}

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return Math.round(n).toString()
}

function modelFamily(id = '') {
  if (id.includes('opus'))   return 'opus'
  if (id.includes('sonnet')) return 'sonnet'
  if (id.includes('haiku'))  return 'haiku'
  return 'unknown'
}

function shortModel(id = '') {
  return id.replace('claude-', '').split('-').slice(0, 3).join('-')
}

function TokenRow({ label, value, color }) {
  const display = useSpringNumber(value)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <span className="label">{label}</span>
      <span className="mono val-small" style={{ color: color ?? 'var(--text-primary)' }}>
        {fmtNum(display)}
      </span>
    </div>
  )
}

export default function SessionTotals({ latest }) {
  const cost = useSpringNumber(latest?.costUSD ?? 0)

  if (!latest) {
    return (
      <div>
        <div className="label" style={{ marginBottom: 12 }}>session totals</div>
        <div className="muted" style={{ fontSize: '0.8rem' }}>Waiting for data…</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div className="label">session totals</div>

      {/* Model badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {latest.models.map((m, i) => (
          <span key={i} className={`model-badge model-badge--${modelFamily(m)}`}>
            {shortModel(m)}
          </span>
        ))}
      </div>

      {/* Total cost */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="val-medium amber">${cost.toFixed(4)}</span>
        <span className="label">total cost</span>
      </div>

      {/* Token breakdown */}
      <div style={{ flex: 1 }}>
        <TokenRow label="input"        value={latest.inputTokens} />
        <TokenRow label="output"       value={latest.outputTokens} color="var(--accent-cyan)" />
        <TokenRow label="cache write"  value={latest.cacheCreationTokens} color="var(--text-muted)" />
        <TokenRow label="cache read"   value={latest.cacheReadTokens} color="var(--text-muted)" />
        <div style={{ borderTop: '1px solid var(--card-border)', marginTop: 8, paddingTop: 8 }}>
          <TokenRow label="total" value={latest.totalTokens} color="var(--text-primary)" />
        </div>
      </div>
    </div>
  )
}
