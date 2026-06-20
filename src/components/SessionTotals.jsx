import { useState, useEffect, useRef } from 'react'
import { getPrices, FALLBACK_PRICES } from '../lib/modelPrices.js'

function useSpringNumber(target, duration = 200) {
  const [display, setDisplay] = useState(target)
  const rafRef  = useRef(null)

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    const from = display
    const start = performance.now()

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
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

function fmtDuration(ms) {
  const s   = Math.floor(ms / 1000)
  const min = Math.floor(s / 60)
  const hr  = Math.floor(min / 60)
  if (hr > 0)  return `${hr}h ${min % 60}m`
  if (min > 0) return `${min}m ${s % 60}s`
  return `${s}s`
}

function modelFamily(id = '') {
  if (id.includes('opus'))   return 'opus'
  if (id.includes('sonnet')) return 'sonnet'
  if (id.includes('haiku'))  return 'haiku'
  if (id.includes('fable'))  return 'fable'
  return 'unknown'
}

function shortModel(id = '') {
  return id.replace('claude-', '').split('-').slice(0, 3).join('-')
}

function TokenRow({ label, value, color, cost }) {
  const display = useSpringNumber(value)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
      <span className="label" style={{ fontSize: '0.6rem', minWidth: 64 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="mono" style={{ color: color ?? 'var(--text-primary)', fontSize: '0.72rem' }}>
          {fmtNum(display)}
        </span>
        {cost != null && (
          <span className="mono muted" style={{ fontSize: '0.68rem', opacity: 0.7, minWidth: 36, textAlign: 'right' }}>
            ${cost.toFixed(2)}
          </span>
        )}
      </span>
    </div>
  )
}

function useLiveDuration(startTime) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) { setElapsed(0); return }
    const start = new Date(startTime).getTime()
    const tick = () => setElapsed(Date.now() - start)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTime])

  return elapsed
}

export default function SessionTotals({ latest }) {
  const cost    = useSpringNumber(latest?.costUSD ?? 0)
  const elapsed = useLiveDuration(latest?.startTime ?? null)

  const prices = latest?.models?.[0]
    ? (getPrices(latest.models[0]) ?? FALLBACK_PRICES)
    : FALLBACK_PRICES

  const inputCost       = latest ? latest.inputTokens       * prices.input     / 1_000_000 : 0
  const outputCost      = latest ? latest.outputTokens      * prices.output    / 1_000_000 : 0
  const cacheReadCost   = latest ? latest.cacheReadTokens   * prices.cacheRead / 1_000_000 : 0
  const cacheWriteCost  = latest ? latest.cacheCreationTokens * prices.cacheWrite / 1_000_000 : 0

  if (!latest) {
    return (
      <div>
        <div className="label" style={{ marginBottom: 12 }}>session totals</div>
        <div className="muted" style={{ fontSize: '0.8rem' }}>Waiting for data…</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      {/* Header with duration */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="label">session totals</span>
        {elapsed > 0 && (
          <span className="mono muted" style={{ fontSize: '0.65rem', opacity: 0.6 }}>
            {fmtDuration(elapsed)}
          </span>
        )}
      </div>

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
        <span className="val-medium amber">${cost.toFixed(2)}</span>
        <span className="label">total cost</span>
      </div>

      {/* Token breakdown with per-type costs */}
      <div style={{ flex: 1 }}>
        <TokenRow label="input"  value={latest.inputTokens}  color="var(--text-primary)" cost={inputCost} />
        <TokenRow label="output" value={latest.outputTokens} color="var(--accent-cyan)"  cost={outputCost} />
        {latest.cacheReadTokens > 0 && (
          <TokenRow label="cache read"  value={latest.cacheReadTokens}   color="var(--text-muted)" cost={cacheReadCost} />
        )}
        {latest.cacheCreationTokens > 0 && (
          <TokenRow label="cache write" value={latest.cacheCreationTokens} color="var(--text-muted)" cost={cacheWriteCost} />
        )}
        <div style={{ borderTop: '1px solid var(--card-border)', marginTop: 6, paddingTop: 6 }}>
          <TokenRow label="total" value={latest.totalTokens} color="var(--text-primary)" />
        </div>
      </div>
    </div>
  )
}
