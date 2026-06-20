import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return Math.round(n).toString()
}

function projectedDayCost(costPerMin) {
  const now = new Date()
  const minsRemaining = (24 * 60) - (now.getHours() * 60 + now.getMinutes())
  return costPerMin * minsRemaining
}

const HOLD_MS = 4000

export default function BurnRateHero({
  burnRate, isIdle, isOverThreshold, threshold, onThresholdChange, error, delta, interval, snapshots,
}) {
  const [editingThreshold, setEditingThreshold] = useState(false)
  const [editValue, setEditValue] = useState(threshold.toFixed(2))
  const inputRef = useRef(null)

  // Hold last active values during idle grace period, then fade to zero
  const lastActiveRef = useRef(burnRate)
  const [idleHeld, setIdleHeld] = useState(false)

  // History navigation
  const nonZeroSnaps = useMemo(() =>
    (snapshots ?? []).filter(s => s.burnRateTokensPerMin > 0),
    [snapshots]
  )
  const [histIdx, setHistIdx] = useState(null) // null = live
  const isHistorical = histIdx !== null

  const navPrev = useCallback(() => {
    setHistIdx(i => {
      if (nonZeroSnaps.length === 0) return null
      if (i === null) return nonZeroSnaps.length - 1
      return Math.max(0, i - 1)
    })
  }, [nonZeroSnaps.length])

  const navNext = useCallback(() => {
    setHistIdx(i => {
      if (i === null) return null
      if (i >= nonZeroSnaps.length - 1) return null
      return i + 1
    })
  }, [nonZeroSnaps.length])

  // Reset to live when new snapshots arrive and we're at tail
  const prevSnapLenRef = useRef(nonZeroSnaps.length)
  useEffect(() => {
    if (nonZeroSnaps.length !== prevSnapLenRef.current) {
      prevSnapLenRef.current = nonZeroSnaps.length
      setHistIdx(i => (i !== null && i >= nonZeroSnaps.length - 1 ? null : i))
    }
  }, [nonZeroSnaps.length])

  // Keyboard: ← →, Escape to return to live
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); navNext() }
      if (e.key === 'Escape')     setHistIdx(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navPrev, navNext])

  useEffect(() => {
    if (!isIdle) {
      lastActiveRef.current = burnRate
      setIdleHeld(false)
      return
    }
    const t = setTimeout(() => setIdleHeld(true), HOLD_MS)
    return () => clearTimeout(t)
  }, [isIdle]) // eslint-disable-line react-hooks/exhaustive-deps

  // Historical snapshot overrides live display
  const histSnap = isHistorical ? nonZeroSnaps[histIdx] : null
  const histBurnRate = histSnap ? {
    tokensPerSec: histSnap.burnRateTokensPerMin / 60,
    costPerMin:   histSnap.burnRateCostPerHour / 60,
    costPerHour:  histSnap.burnRateCostPerHour,
  } : null

  // During hold: freeze last active values. After hold: spring to zero.
  const displaySource = histBurnRate
    ?? ((isIdle && idleHeld)  ? { tokensPerSec: 0, costPerMin: 0, costPerHour: 0 }
       : isIdle                ? lastActiveRef.current
       : burnRate)
  const flameOpacity = isHistorical ? 0
    : Math.min((isIdle && !idleHeld ? lastActiveRef.current.costPerMin : burnRate.costPerMin) / (threshold || 0.01), 1) * 0.9
  const accentColor = isHistorical ? 'var(--text-muted)'
    : isOverThreshold ? 'var(--accent-danger)' : 'var(--accent-cyan)'

  const displayTokens   = displaySource.tokensPerSec
  const displayCostHour = displaySource.costPerHour
  const showIdle = !isHistorical && isIdle && idleHeld

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="label">burn rate</span>
        {showIdle && <span className="label" style={{ color: 'var(--text-muted)' }}>idle</span>}
        {isHistorical && (
          <span className="mono muted" style={{ fontSize: '0.62rem' }}>
            {histIdx + 1}/{nonZeroSnaps.length}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {!isHistorical && isOverThreshold && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent-danger)', fontWeight: 600 }}>
            OVER THRESHOLD
          </span>
        )}
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={navPrev}
            disabled={nonZeroSnaps.length === 0 || histIdx === 0}
            title="Previous (←)"
            style={{
              background: 'none', border: '1px solid var(--card-border)', borderRadius: 4,
              color: 'var(--text-muted)', cursor: 'pointer', padding: '1px 7px',
              fontSize: '0.7rem', fontFamily: 'var(--font-mono)', opacity: (nonZeroSnaps.length === 0 || histIdx === 0) ? 0.3 : 1,
            }}
          >‹</button>
          <button
            onClick={navNext}
            disabled={!isHistorical}
            title="Next (→)"
            style={{
              background: 'none', border: '1px solid var(--card-border)', borderRadius: 4,
              color: isHistorical ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: isHistorical ? 'pointer' : 'default',
              padding: '1px 7px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
              opacity: isHistorical ? 1 : 0.3,
            }}
          >›</button>
        </div>
      </div>

      {error ? (
        <div style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{error}</div>
          {error.toLowerCase().includes('ccusage') && <div style={{ opacity: 0.7 }}>npm i -g ccusage</div>}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <div className="val-large" style={{ color: accentColor }}>
                {displayTokens.toFixed(1)}
                <span style={{ fontSize: '0.4em', color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>tok/s</span>
              </div>
              <div className="val-medium amber">
                ${displayCostHour.toFixed(2)}
                <span style={{ fontSize: '0.55em', color: 'var(--text-muted)', marginLeft: 5, fontWeight: 400 }}>/hr</span>
              </div>
            </div>
            <div className="mono muted" style={{ fontSize: '0.7rem', opacity: showIdle ? 0 : 1, transition: 'opacity 0.3s', display: 'flex', gap: 14 }}>
              <span>~${projectedDayCost(displaySource.costPerMin).toFixed(2)} <span style={{ fontSize: '0.85em' }}>today</span></span>
              <span>~${(projectedDayCost(displaySource.costPerMin) * 7).toFixed(2)} <span style={{ fontSize: '0.85em' }}>7d</span></span>
              <span>~${(projectedDayCost(displaySource.costPerMin) * 30).toFixed(2)} <span style={{ fontSize: '0.85em' }}>30d</span></span>
            </div>
          </div>

          {/* Threshold pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -2 }}>
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
            <span className="mono muted" style={{ fontSize: '0.65rem', opacity: 0.55 }}>
              (${(threshold * 60).toFixed(2)}/hr)
            </span>
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
