import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useUsageStore } from '../hooks/useUsageStore.js'
import { useHistoryStore } from '../hooks/useHistoryStore.js'

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return Math.round(n).toString()
}

function barColor(tokens, thresholdTokens) {
  if (thresholdTokens <= 0) return 'var(--accent-cyan)'
  const ratio = tokens / thresholdTokens
  if (ratio >= 1.0) return 'var(--accent-danger)'
  if (ratio >= 0.6) return 'var(--accent-amber)'
  return 'var(--accent-cyan)'
}

function RollingBars({ rows, threshold, costPerToken, bucketSec, onBarCountChange }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width: w, height: h } = entries[0].contentRect
      setWidth(w)
      setHeight(h)
      const count = Math.max(1, Math.floor((w - 8) / 7))
      onBarCountChange?.(count)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [onBarCountChange])

  const BAR_WIDTH = 6
  const BAR_GAP = 1
  const padTop = 16
  const padBottom = 20
  const padLeft = 4
  const padRight = 4

  const chartH = Math.max(1, height - padTop - padBottom)

  const thresholdTokens = useMemo(() => {
    if (costPerToken <= 0) return Infinity
    return (threshold / costPerToken) * (bucketSec / 60)
  }, [threshold, costPerToken, bucketSec])

  // How many bars fit in the current width; slice to the most recent N.
  const barCount = width > 0
    ? Math.max(1, Math.floor((width - padLeft - padRight) / (BAR_WIDTH + BAR_GAP)))
    : 1
  const visibleRows = useMemo(() => rows.slice(-barCount), [rows, barCount])

  const maxVal = useMemo(() => {
    const dataMax = Math.max(...visibleRows.map(r => r.tokens), 0)
    const threshLine = thresholdTokens === Infinity ? 0 : thresholdTokens
    return Math.max(dataMax, threshLine) * 1.15 || 1000
  }, [visibleRows, thresholdTokens])

  const threshY = thresholdTokens === Infinity
    ? -10
    : padTop + chartH - (thresholdTokens / maxVal) * chartH

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left - padLeft
    const idx = Math.floor(x / (BAR_WIDTH + BAR_GAP))
    if (idx >= 0 && idx < visibleRows.length) {
      setHoverIdx(idx)
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    } else {
      setHoverIdx(null)
    }
  }, [visibleRows.length])

  const handleMouseLeave = useCallback(() => setHoverIdx(null), [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', cursor: 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {width > 0 && height > 0 && (
        <svg width={width} height={height} style={{ display: 'block' }}>
          {/* Threshold reference line */}
          {threshY > 0 && threshY < height && (
            <line
              x1={padLeft} y1={threshY}
              x2={width - padRight} y2={threshY}
              stroke="var(--accent-danger)"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.6}
            />
          )}

          {/* 60% warning line */}
          {thresholdTokens !== Infinity && (() => {
            const warnY = padTop + chartH - (thresholdTokens * 0.6 / maxVal) * chartH
            return warnY > 0 && warnY < height ? (
              <line
                x1={padLeft} y1={warnY}
                x2={width - padRight} y2={warnY}
                stroke="var(--accent-amber)"
                strokeWidth={0.5}
                strokeDasharray="2 4"
                opacity={0.4}
              />
            ) : null
          })()}

          {/* Bars — fixed width, newest at right edge */}
          {visibleRows.map((row, i) => {
            const barH = Math.max(1, (row.tokens / maxVal) * chartH)
            const x = padLeft + i * (BAR_WIDTH + BAR_GAP)
            const y = padTop + chartH - barH
            const isHovered = i === hoverIdx
            return (
              <rect
                key={`${row.ts}-${i}`}
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={barH}
                rx={1}
                fill={barColor(row.tokens, thresholdTokens)}
                opacity={isHovered ? 1 : 0.75}
                stroke={isHovered ? 'white' : 'none'}
                strokeWidth={isHovered ? 0.5 : 0}
              />
            )
          })}

          {/* Threshold label */}
          {threshY > 10 && threshY < height - 10 && (
            <text
              x={width - padRight - 2}
              y={threshY - 4}
              textAnchor="end"
              fill="var(--accent-danger)"
              fontSize={9}
              fontFamily="var(--font-mono)"
              opacity={0.7}
            >
              ${threshold.toFixed(2)}/min
            </text>
          )}
        </svg>
      )}

      {/* Tooltip */}
      {hoverIdx !== null && visibleRows[hoverIdx] && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltipPos.x + 12, width - 160),
          top: Math.max(tooltipPos.y - 60, 4),
          background: 'rgba(7,8,13,0.94)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: '8px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          pointerEvents: 'none',
          zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
            {new Date(visibleRows[hoverIdx].ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          <div style={{ color: 'var(--accent-cyan)' }}>
            {fmtNum(visibleRows[hoverIdx].tokens)} tok
          </div>
          <div style={{ color: 'var(--accent-amber)' }}>
            ${visibleRows[hoverIdx].costUSD?.toFixed(5) ?? '0'} cost
          </div>
          {visibleRows[hoverIdx].models?.length > 0 && (
            <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.62rem' }}>
              {visibleRows[hoverIdx].models.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function gaugeColor(costPerMin, threshold) {
  if (costPerMin >= threshold) return 'var(--accent-danger)'
  if (costPerMin >= threshold * 0.6) return 'var(--accent-amber)'
  return 'var(--accent-cyan)'
}

export default function BurnGauge() {
  const { snapshots, delta, interval, threshold, error } = useUsageStore()
  const { rows, range, loading, error: histError, setRange, setBarCount, ranges } = useHistoryStore()

  const [label, setLabel] = useState('')
  const [labelSaved, setLabelSaved] = useState(false)
  const labelRef = useRef(label)
  labelRef.current = label

  const latestSnapshot = useMemo(() => snapshots[snapshots.length - 1] ?? null, [snapshots])
  const sessionId = latestSnapshot?.sessionId ?? null

  const costPerToken = useMemo(() => {
    if (!latestSnapshot || latestSnapshot.totalTokens === 0) return 0.00001
    return latestSnapshot.costUSD / latestSnapshot.totalTokens
  }, [latestSnapshot])

  const BUCKET_SEC = { '1m': 2, '5m': 10, '15m': 30, '1h': 120, '6h': 720, '24h': 2880 }
  const bucketSec = BUCKET_SEC[range] ?? 10

  async function saveLabel() {
    if (!sessionId || !labelRef.current.trim()) return
    await fetch('/api/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, label: labelRef.current.trim() }),
    })
    setLabelSaved(true)
    setTimeout(() => setLabelSaved(false), 2000)
  }

  const tokPerInterval = delta?.tokens ?? 0
  const costPerInterval = delta?.cost ?? 0
  const costPerMin = interval > 0 ? (costPerInterval / interval) * 60 : 0
  const isIdle = tokPerInterval === 0

  const color = isIdle ? 'var(--text-muted)' : gaugeColor(costPerMin, threshold)

  const barMax = useMemo(() => {
    const recent = snapshots.slice(-30)
    if (recent.length < 2) return 1000
    const deltas = []
    for (let i = 1; i < recent.length; i++) {
      deltas.push(Math.max(0, recent[i].totalTokens - recent[i - 1].totalTokens))
    }
    return Math.max(Math.max(...deltas) * 1.2, 1000)
  }, [snapshots])

  const barPct = Math.min(tokPerInterval / barMax, 1)

  const btnBase = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    letterSpacing: '0.08em',
    padding: '3px 10px',
    borderRadius: 999,
    border: '1px solid',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  }

  if (error) {
    return (
      <div className="glass-card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{error}</div>
          {error.toLowerCase().includes('ccusage') && <div style={{ opacity: 0.7 }}>npm i -g ccusage</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Live burn header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="label">live burn</span>
          {isIdle && <span className="label" style={{ color: 'var(--text-muted)' }}>idle</span>}
          <span style={{ flex: 1 }} />
          {costPerMin >= threshold && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent-danger)', fontWeight: 600 }}>
              OVER THRESHOLD
            </span>
          )}
        </div>

        {/* Big number + cost */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)',
            fontWeight: 700,
            color,
            lineHeight: 1,
            transition: 'color 0.3s',
          }}>
            {isIdle ? '—' : fmtNum(tokPerInterval)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            tok/{interval}s
          </span>
          <span style={{ flex: 1 }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(0.9rem, 1.8vw, 1.3rem)',
            fontWeight: 600,
            color: isIdle ? 'var(--text-muted)' : 'var(--accent-amber)',
            lineHeight: 1,
            transition: 'color 0.3s',
          }}>
            {isIdle ? '—' : `$${costPerInterval.toFixed(5)}`}
          </span>
        </div>

        {/* Live bar */}
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${barPct * 100}%`,
            borderRadius: 3,
            background: color,
            transition: 'width 0.3s, background 0.3s',
            opacity: isIdle ? 0.2 : 0.8,
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="mono muted" style={{ fontSize: '0.58rem' }}>
            {isIdle ? '0 tok' : `0 — ${fmtNum(barMax)} tok`}
          </span>
          <span className="mono muted" style={{ fontSize: '0.58rem' }}>
            ~${costPerMin.toFixed(4)}/min
          </span>
        </div>
      </div>

      {/* Divider + range picker */}
      <div style={{ borderTop: '1px solid var(--card-border)', margin: '8px 0 6px', paddingTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="label">history</span>
        {loading && <span className="muted" style={{ fontSize: '0.6rem' }}>...</span>}
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 3 }}>
          {ranges.map(r => {
            const active = r === range
            return (
              <button key={r} onClick={() => setRange(r)} style={{
                ...btnBase,
                fontSize: '0.6rem',
                padding: '2px 8px',
                background: active ? 'rgba(0,229,255,0.15)' : 'transparent',
                borderColor: active ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.12)',
                color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
              }}>{r}</button>
            )
          })}
        </div>
      </div>

      {/* Rolling bar chart */}
      <div style={{ flex: 1, minHeight: 80 }}>
        {histError ? (
          <div style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textAlign: 'center', paddingTop: 30 }}>
            {histError}
          </div>
        ) : rows.length === 0 && !loading ? (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textAlign: 'center', paddingTop: 30 }}>
            no data yet — history builds as you use Claude
          </div>
        ) : (
          <RollingBars
            rows={rows}
            threshold={threshold}
            costPerToken={costPerToken}
            bucketSec={bucketSec}
            onBarCountChange={setBarCount}
          />
        )}
      </div>

      {/* Footer: label input */}
      {sessionId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexShrink: 0, borderTop: '1px solid var(--card-border)', paddingTop: 6 }}>
          <span className="label">label</span>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={e => e.key === 'Enter' && saveLabel()}
            placeholder="e.g. no-plugins / with-context7"
            style={{
              flex: 1,
              maxWidth: 260,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              padding: '3px 10px',
              outline: 'none',
            }}
          />
          {labelSaved && <span style={{ color: 'var(--accent-cyan)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>saved</span>}
        </div>
      )}
    </div>
  )
}
