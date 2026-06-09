import { useState, useRef, useEffect } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useHistoryStore } from '../hooks/useHistoryStore.js'

function fmtTs(ts, resolution) {
  const d = new Date(ts)
  if (resolution === 'hour') {
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: resolution === 'second' ? '2-digit' : undefined, hour12: false })
}

function CustomTooltip({ active, payload, label, resolution }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(7,8,13,0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      padding: '10px 14px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.72rem',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{fmtTs(label, resolution)}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(p.dataKey === 'costUSD' ? 5 : 0) : p.value}</strong>
          {p.dataKey === 'tokens' && ' tok'}
          {p.dataKey === 'costUSD' && ' $'}
          {p.dataKey === 'burnTokMin' && ' tok/min'}
        </div>
      ))}
    </div>
  )
}

export default function HistoryChart({ sessionId }) {
  const { rows, plugins, resolution, sincePreset, loading, error,
          setResolution, setSincePreset, resolutions, sincePresets, refetch } = useHistoryStore()

  const [label, setLabel]         = useState('')
  const [labelSaved, setLabelSaved] = useState(false)
  const labelRef = useRef(label)
  labelRef.current = label

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

  function resBtn(r) {
    const active = r === resolution
    return (
      <button key={r} onClick={() => setResolution(r)} style={{
        ...btnBase,
        background: active ? 'rgba(0,229,255,0.15)' : 'transparent',
        borderColor: active ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.12)',
        color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
        textTransform: 'uppercase',
      }}>{r === 'second' ? '1s' : r === 'minute' ? '1m' : '1h'}</button>
    )
  }

  function rangeBtn(p) {
    const active = p === sincePreset
    return (
      <button key={p} onClick={() => setSincePreset(p)} style={{
        ...btnBase,
        background: active ? 'rgba(255,179,0,0.12)' : 'transparent',
        borderColor: active ? 'rgba(255,179,0,0.4)' : 'rgba(255,255,255,0.12)',
        color: active ? 'var(--accent-amber)' : 'var(--text-muted)',
      }}>{p}</button>
    )
  }

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="label">history</span>
          {loading && <span className="muted" style={{ fontSize: '0.65rem' }}>loading…</span>}
          {plugins.length > 0 && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              plugins: {plugins.join(', ')}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>{sincePresets.map(rangeBtn)}</div>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', gap: 4 }}>{resolutions.map(resBtn)}</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
      {error ? (
        <div style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '40px 0', textAlign: 'center' }}>
          {error}
        </div>
      ) : rows.length === 0 && !loading ? (
        <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '40px 0', textAlign: 'center' }}>
          no data yet — history builds as you use Claude
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="histCyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#00e5ff" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={ts => fmtTs(ts, resolution)}
              tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
              minTickGap={60}
            />

            <YAxis
              yAxisId="tokens"
              tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
            />

            <YAxis
              yAxisId="cost"
              orientation="right"
              tick={{ fill: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={v => `$${v.toFixed(4)}`}
            />

            <Tooltip content={<CustomTooltip resolution={resolution} />} />

            <Area
              yAxisId="tokens"
              type="monotone"
              dataKey="tokens"
              name="tokens"
              stroke="#00e5ff"
              strokeWidth={2}
              fill="url(#histCyanGrad)"
              dot={false}
              isAnimationActive={false}
            />

            <Line
              yAxisId="cost"
              type="monotone"
              dataKey="costUSD"
              name="cost $"
              stroke="#ffb300"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
      </div>

      {/* Footer: label input */}
      {sessionId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexShrink: 0 }}>
          <span className="label">label session</span>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={e => e.key === 'Enter' && saveLabel()}
            placeholder="e.g. no-plugins / with-context7"
            style={{
              flex: 1,
              maxWidth: 280,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              padding: '4px 10px',
              outline: 'none',
            }}
          />
          {labelSaved && <span style={{ color: 'var(--accent-cyan)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>saved</span>}
        </div>
      )}
    </div>
  )
}
