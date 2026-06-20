import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useUsageStore } from '../hooks/useUsageStore.js'
import { useHistoryStore } from '../hooks/useHistoryStore.js'

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return Math.round(n).toString()
}

const MODEL_COLORS = {
  haiku:  '#22d3ee', // cyan
  sonnet: '#a78bfa', // violet
  opus:   '#fbbf24', // amber-gold
  fable:  '#f472b6', // pink
}

function modelColor(models) {
  const first = (models?.[0] ?? '').toLowerCase()
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (first.includes(key)) return color
  }
  return '#6b7280' // gray fallback
}

function barColor(models) {
  return modelColor(models)
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
  const padRight = 36 // extra room for cost axis label

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

  const maxCost = useMemo(() => {
    const m = Math.max(...visibleRows.map(r => r.costUSD ?? 0), 0)
    return m * 1.15 || 0.001
  }, [visibleRows])

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
          {/* Threshold zone backgrounds */}
          {thresholdTokens !== Infinity && (() => {
            const warnY  = padTop + chartH - (thresholdTokens * 0.6 / maxVal) * chartH
            const chartBottom = padTop + chartH
            const chartTop    = padTop
            // green zone: bottom → 60% line
            // amber zone: 60% line → 100% line
            // red zone:   100% line → top
            const greenBottom = chartBottom
            const greenTop    = Math.max(Math.min(warnY, chartBottom), chartTop)
            const amberBottom = greenTop
            const amberTop    = Math.max(Math.min(threshY, chartBottom), chartTop)
            const redBottom   = amberTop
            const redTop      = chartTop
            return (
              <>
                {greenTop < greenBottom && (
                  <rect x={padLeft} y={greenTop} width={width - padLeft - padRight}
                    height={greenBottom - greenTop} fill="#22c55e" opacity={0.06} />
                )}
                {amberTop < amberBottom && (
                  <rect x={padLeft} y={amberTop} width={width - padLeft - padRight}
                    height={amberBottom - amberTop} fill="#f59e0b" opacity={0.08} />
                )}
                {redBottom > redTop && (
                  <rect x={padLeft} y={redTop} width={width - padLeft - padRight}
                    height={redBottom - redTop} fill="#ef4444" opacity={0.1} />
                )}
                {/* zone boundary lines */}
                {warnY > chartTop && warnY < chartBottom && (
                  <line x1={padLeft} y1={warnY} x2={width - padRight} y2={warnY}
                    stroke="#f59e0b" strokeWidth={0.5} opacity={0.35} />
                )}
                {threshY > chartTop && threshY < chartBottom && (
                  <line x1={padLeft} y1={threshY} x2={width - padRight} y2={threshY}
                    stroke="#ef4444" strokeWidth={0.5} opacity={0.45} />
                )}
              </>
            )
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
                fill={barColor(row.models)}
                opacity={isHovered ? 1 : 0.75}
                stroke={isHovered ? 'white' : 'none'}
                strokeWidth={isHovered ? 0.5 : 0}
              />
            )
          })}

          {/* Cost line (right Y-axis) */}
          {visibleRows.length > 1 && (() => {
            const points = visibleRows.map((row, i) => {
              const cx = padLeft + i * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2
              const cy = padTop + chartH - ((row.costUSD ?? 0) / maxCost) * chartH
              return `${cx},${cy}`
            }).join(' ')
            const lastRow = visibleRows[visibleRows.length - 1]
            const lastCy = padTop + chartH - ((lastRow?.costUSD ?? 0) / maxCost) * chartH
            const rightX = width - padRight + 4
            // right axis ticks
            const midCost = maxCost / 2
            const midY = padTop + chartH * 0.5
            const topY = padTop
            const fmtCost = v => v < 0.001 ? v.toFixed(6) : v < 0.01 ? v.toFixed(5) : v.toFixed(4)
            return (
              <>
                <polyline
                  points={points}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  opacity={0.85}
                />
                {/* dots at each point */}
                {visibleRows.map((row, i) => {
                  const cx = padLeft + i * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2
                  const cy = padTop + chartH - ((row.costUSD ?? 0) / maxCost) * chartH
                  return (
                    <circle key={i} cx={cx} cy={cy} r={i === hoverIdx ? 3 : 1.5}
                      fill="#34d399" opacity={i === hoverIdx ? 1 : 0.7} />
                  )
                })}
                {/* right axis line */}
                <line x1={width - padRight + 2} y1={padTop} x2={width - padRight + 2} y2={padTop + chartH}
                  stroke="rgba(52,211,153,0.25)" strokeWidth={0.5} />
                {/* top tick = maxCost */}
                <text x={rightX} y={topY + 4} fontSize={8} fontFamily="var(--font-mono)"
                  fill="#34d399" opacity={0.7}>${fmtCost(maxCost / 1.15)}</text>
                {/* mid tick */}
                <text x={rightX} y={midY + 4} fontSize={8} fontFamily="var(--font-mono)"
                  fill="#34d399" opacity={0.5}>${fmtCost(midCost / 1.15)}</text>
                {/* label */}
                <text x={rightX} y={padTop + chartH + 12} fontSize={8} fontFamily="var(--font-mono)"
                  fill="#34d399" opacity={0.5}>$</text>
              </>
            )
          })()}

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
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>{fmtNum(visibleRows[hoverIdx].tokens)} tok</span>
            <span style={{ color: '#34d399' }}>${visibleRows[hoverIdx].costUSD?.toFixed(5) ?? '0'}</span>
          </div>
          {visibleRows[hoverIdx].models?.length > 0 && (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {visibleRows[hoverIdx].models.map(m => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.62rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: modelColor([m]), flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)' }}>{m}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


const RANGE_DESC = {
  '1m':  'last 1 min · 2s buckets',
  '5m':  'last 5 min · 10s buckets',
  '15m': 'last 15 min · 30s buckets',
  '1h':  'last 1 hr · 2m buckets',
  '6h':  'last 6 hr · 12m buckets',
  '24h': 'last 24 hr · 48m buckets',
}

export default function BurnGauge({ threshold, range: rangeProp }) {
  const { snapshots, error } = useUsageStore()
  const [chartFrozen, setChartFrozen] = useState(false)
  const { rows, range, loading, error: histError, setBarCount } = useHistoryStore(chartFrozen, rangeProp)

  const latestSnapshot = useMemo(() => snapshots[snapshots.length - 1] ?? null, [snapshots])
  const costPerToken = useMemo(() => {
    if (!latestSnapshot || latestSnapshot.totalTokens === 0) return 0.00001
    return latestSnapshot.costUSD / latestSnapshot.totalTokens
  }, [latestSnapshot])

  const BUCKET_SEC = { '1m': 2, '5m': 10, '15m': 30, '1h': 120, '6h': 720, '24h': 2880 }
  const bucketSec = BUCKET_SEC[range] ?? 10

  if (error) {
    return (
      <div className="glass-card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Divider + status */}
      <div style={{ borderTop: '1px solid var(--card-border)', margin: '8px 0 6px', paddingTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="label">history</span>
        <span className="mono muted" style={{ fontSize: '0.58rem' }}>{RANGE_DESC[range]}</span>
        {loading && <span className="muted" style={{ fontSize: '0.6rem' }}>...</span>}
        {chartFrozen && <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--accent-amber)' }}>hover-freeze</span>}
      </div>

      {/* Rolling bar chart */}
      <div
        style={{ flex: 1, minHeight: 0 }}
        onMouseEnter={() => setChartFrozen(true)}
        onMouseLeave={() => setChartFrozen(false)}
      >
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

    </div>
  )
}
