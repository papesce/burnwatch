import { useState, useEffect, useRef } from 'react'

function fmt(ts) {
  if (!ts) return '--:--:--'
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false })
}

export default function StatusBar({ lastPollTs, interval, latencyMs, paused, darkMode, onPause, onIntervalChange, onThemeToggle }) {
  const [countdown, setCountdown] = useState(0)
  const lastPollRef = useRef(lastPollTs)

  useEffect(() => { lastPollRef.current = lastPollTs }, [lastPollTs])

  // Isolated 200ms ticker — doesn't cause full-tree re-render
  useEffect(() => {
    if (paused) { setCountdown(0); return }
    const id = setInterval(() => {
      const elapsed = lastPollRef.current ? Date.now() - lastPollRef.current : 0
      setCountdown(Math.max(0, interval * 1000 - elapsed))
    }, 200)
    return () => clearInterval(id)
  }, [paused, interval])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: '100%', flexWrap: 'wrap' }}>
      {/* Live dot + timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`live-dot${paused ? ' live-dot--paused' : ''}`} />
        <span className="mono val-small muted">{fmt(lastPollTs)}</span>
        {latencyMs != null && (
          <span className="mono val-small" style={{ color: latencyMs > 500 ? 'var(--accent-danger)' : 'var(--text-muted)', fontSize: '0.7rem' }}>
            {latencyMs}ms
          </span>
        )}
      </div>

      {/* Countdown */}
      {!paused && (
        <span className="mono muted" style={{ fontSize: '0.7rem' }}>
          next {(countdown / 1000).toFixed(1)}s
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* Interval slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="label">poll</span>
        <input
          type="range" min={1} max={30} value={interval}
          onChange={e => onIntervalChange(Number(e.target.value))}
          style={{ width: 80, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
        />
        <span className="mono val-small cyan">{interval}s</span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={onThemeToggle}
        title="Toggle theme (D)"
        style={{
          background: 'none', border: '1px solid var(--card-border)', borderRadius: 8,
          color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 10px', fontSize: '0.85rem',
        }}
      >
        {darkMode ? '☀' : '🌙'}
      </button>

      {/* Pause / resume */}
      <button
        onClick={onPause}
        title={paused ? 'Resume (Space)' : 'Pause (Space)'}
        style={{
          background: paused ? 'rgba(0,229,255,0.1)' : 'none',
          border: '1px solid var(--card-border)', borderRadius: 8,
          color: paused ? 'var(--accent-cyan)' : 'var(--text-muted)',
          cursor: 'pointer', padding: '4px 12px', fontSize: '1rem',
          transition: 'all 0.2s',
        }}
      >
        {paused ? '▶' : '⏸'}
      </button>

      {/* Keyboard hints */}
      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', opacity: 0.5 }}>
        Space·pause&nbsp;&nbsp;+/−·interval&nbsp;&nbsp;D·theme
      </span>
    </div>
  )
}
