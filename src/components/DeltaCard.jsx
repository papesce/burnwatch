import { useState, useEffect, useRef } from 'react'

function useSpringNumber(target, duration = 200) {
  const [display, setDisplay] = useState(target)
  const rafRef = useRef(null)

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

export default function DeltaCard({ delta, interval }) {
  const tokens = useSpringNumber(delta?.tokens ?? 0)
  const cost   = useSpringNumber(delta?.cost   ?? 0)
  const idle   = !delta || delta.tokens === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label">Δ last {interval}s</span>
        {idle && <span className="label" style={{ color: 'var(--text-muted)' }}>idle</span>}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        {/* Token delta */}
        <div>
          <div className="label" style={{ marginBottom: 4 }}>tokens</div>
          <div className="val-medium" style={{ color: idle ? 'var(--text-muted)' : 'var(--accent-cyan)', transition: 'color 0.4s' }}>
            {idle ? '—' : `+${fmtNum(tokens)}`}
          </div>
        </div>

        {/* Cost delta */}
        <div>
          <div className="label" style={{ marginBottom: 4 }}>cost</div>
          <div className="val-medium" style={{ color: idle ? 'var(--text-muted)' : 'var(--accent-amber)', transition: 'color 0.4s' }}>
            {idle ? '—' : `+$${cost.toFixed(5)}`}
          </div>
        </div>
      </div>

      {!idle && (
        <div className="mono muted" style={{ fontSize: '0.65rem' }}>
          ~{((delta?.cost ?? 0) * (60 / interval)).toFixed(4)} $/min projected
        </div>
      )}
    </div>
  )
}
