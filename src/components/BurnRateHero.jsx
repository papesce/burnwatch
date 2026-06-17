import { useState, useEffect, useRef } from 'react'

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return Math.round(n).toString()
}

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
  }, [target])
  return display
}

export default function BurnRateHero({
  burnRate, isIdle, isOverThreshold, threshold, onThresholdChange, error, delta, interval,
}) {
  const [editingThreshold, setEditingThreshold] = useState(false)
  const [editValue, setEditValue] = useState(threshold.toFixed(2))
  const inputRef = useRef(null)

  const flameOpacity = Math.min(burnRate.costPerMin / (threshold || 0.01), 1) * 0.9
  const accentColor = isOverThreshold ? 'var(--accent-danger)' : 'var(--accent-cyan)'

  const displayTokens  = useSpringNumber(burnRate.tokensPerSec)
  const displayCostMin = useSpringNumber(burnRate.costPerMin)
  const displayCostHour = useSpringNumber(burnRate.costPerHour)

  const hasDelta = delta && delta.tokens > 0

  useEffect(() => {
    if (editingThreshold && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingThreshold])

  const commitThreshold = () => {
    const val = parseFloat(editValue)
    if (!isNaN(val) && val >= 0.001) onThresholdChange(val)
    setEditingThreshold(false)
  }

  return (
    <div
      className="burn-flame"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        '--flame-opacity': flameOpacity,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="label">burn rate</span>
        {isIdle && <span className="label" style={{ color: 'var(--text-muted)' }}>idle</span>}
        <span style={{ flex: 1 }} />
        {isOverThreshold && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent-danger)', fontWeight: 600 }}>
            OVER THRESHOLD
          </span>
        )}
      </div>

      {error ? (
        <div style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{error}</div>
          {error.toLowerCase().includes('ccusage') && <div style={{ opacity: 0.7 }}>npm i -g ccusage</div>}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <div className="val-large" style={{ color: accentColor }}>
              {displayTokens.toFixed(1)}
              <span style={{ fontSize: '0.4em', color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>tok/s</span>
            </div>
            <div className="val-medium amber">
              ${displayCostMin.toFixed(4)}
              <span style={{ fontSize: '0.55em', color: 'var(--text-muted)', marginLeft: 5, fontWeight: 400 }}>/min</span>
            </div>
            <div className="mono muted" style={{ fontSize: '0.75rem' }}>
              ${displayCostHour.toFixed(2)}/hr
            </div>
          </div>

          {/* Delta inline */}
          {hasDelta && (
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
              <span>Δ <span style={{ color: 'var(--accent-cyan)' }}>+{fmtNum(delta.tokens)} tok</span></span>
              <span>Δ <span style={{ color: 'var(--accent-amber)' }}>+${delta.cost.toFixed(5)}</span></span>
              <span className="muted" style={{ fontSize: '0.6rem' }}>this poll</span>
            </div>
          )}

          {/* Threshold pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: hasDelta ? 0 : -2 }}>
            <span className="label" style={{ fontSize: '0.65rem' }}>alert</span>
            {editingThreshold ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitThreshold}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitThreshold()
                  if (e.key === 'Escape') { setEditingThreshold(false); setEditValue(threshold.toFixed(2)) }
                }}
                style={{
                  width: 62,
                  background: 'rgba(255,255,255,0.08)',
                  border: `1px solid ${isOverThreshold ? 'var(--accent-danger)' : 'var(--accent-cyan)'}`,
                  borderRadius: 999,
                  color: isOverThreshold ? 'var(--accent-danger)' : 'var(--accent-cyan)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
            ) : (
              <span
                onClick={() => { setEditValue(threshold.toFixed(2)); setEditingThreshold(true) }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 10px',
                  borderRadius: 999,
                  border: `1px solid ${isOverThreshold ? 'rgba(255,77,109,0.4)' : 'rgba(0,229,255,0.25)'}`,
                  background: isOverThreshold ? 'rgba(255,77,109,0.1)' : 'rgba(0,229,255,0.06)',
                  color: isOverThreshold ? 'var(--accent-danger)' : 'var(--accent-cyan)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                ${threshold.toFixed(2)}/min
                <span style={{ fontSize: '0.55rem', opacity: 0.5, marginLeft: 2 }}>&#9998;</span>
              </span>
            )}
            <button
              onClick={() => onThresholdChange(+(threshold + 0.01).toFixed(2))}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--card-border)',
                borderRadius: 4,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0 6px',
                fontSize: '0.7rem',
                lineHeight: '18px',
                fontFamily: 'var(--font-mono)',
              }}
              title="Increase by $0.01"
            >+</button>
            <button
              onClick={() => onThresholdChange(Math.max(0.001, +(threshold - 0.01).toFixed(2)))}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--card-border)',
                borderRadius: 4,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0 6px',
                fontSize: '0.7rem',
                lineHeight: '18px',
                fontFamily: 'var(--font-mono)',
              }}
              title="Decrease by $0.01"
            >−</button>
          </div>
        </>
      )}
    </div>
  )
}
