import { useState, useRef, useEffect } from 'react'
import Logo from './Logo.jsx'

export default function Banner({ darkMode, onThemeToggle, paused, onPause, interval, onIntervalChange }) {
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false)
      }
    }
    if (showSettings) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [showSettings])

  return (
    <header className="bw-banner">
      <div className="bw-banner__left">
        <Logo size={36} />
        <div className="bw-banner__wordmark">
          <span className="bw-banner__burn">burn</span>
          <span className="bw-banner__watch">watch</span>
          <span className="bw-banner__tag">Claude usage monitor</span>
        </div>
      </div>

      <div className="bw-banner__right">
        {/* Pause / resume */}
        <button
          onClick={onPause}
          title={paused ? 'Resume (Space)' : 'Pause (Space)'}
          style={{
            background: paused ? 'rgba(0,229,255,0.1)' : 'none',
            border: '1px solid var(--card-border)',
            borderRadius: 8,
            color: paused ? 'var(--accent-cyan)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: '0.9rem',
            transition: 'all 0.2s',
            lineHeight: 1,
          }}
        >
          {paused ? '▶' : '⏸'}
        </button>

        {/* Settings gear */}
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
            style={{
              background: showSettings ? 'rgba(255,255,255,0.08)' : 'none',
              border: '1px solid var(--card-border)',
              borderRadius: 8,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              lineHeight: 1,
            }}
          >
            ⚙
          </button>

          {showSettings && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: 'rgba(7,8,13,0.96)',
              border: '1px solid var(--card-border)',
              borderRadius: 12,
              padding: '16px 18px',
              minWidth: 200,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              {/* Poll interval */}
              <div>
                <div className="label" style={{ marginBottom: 8 }}>poll interval</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range" min={1} max={30} value={interval}
                    onChange={e => onIntervalChange(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                  />
                  <span className="mono val-small cyan" style={{ minWidth: 32, textAlign: 'right' }}>{interval}s</span>
                </div>
              </div>

              {/* Theme toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="label">theme</span>
                <button
                  onClick={onThemeToggle}
                  title="Toggle theme (D)"
                  style={{
                    background: 'none',
                    border: '1px solid var(--card-border)',
                    borderRadius: 8,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px 12px',
                    fontSize: '0.85rem',
                  }}
                >
                  {darkMode ? '☀ light' : '🌙 dark'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
