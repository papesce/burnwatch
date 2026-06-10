import Sparkline from './Sparkline.jsx'

function fmt(n, decimals = 2) {
  return n.toFixed(decimals)
}

export default function BurnRateHero({
  burnRate, sparklineData, modelSwitchPoints, isIdle,
  isOverThreshold, threshold, onThresholdChange, error,
}) {
  const accentColor = isOverThreshold ? 'var(--accent-danger)' : 'var(--accent-cyan)'

  return (
    <div style={{ display: 'flex', height: '100%', gap: 24 }}>

      {/* Left: numbers */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 160 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>burn rate</div>
          {error ? (
            <div style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{error}</div>
              {error.toLowerCase().includes('ccusage') && <div style={{ opacity: 0.7 }}>npm i -g ccusage</div>}
            </div>
          ) : (
            <>
              <div className="val-large" style={{ color: accentColor }}>
                {fmt(burnRate.tokensPerSec, 1)}
                <span style={{ fontSize: '0.4em', color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>tok/s</span>
              </div>
              <div className="val-medium amber" style={{ marginTop: 10 }}>
                ${fmt(burnRate.costPerMin, 4)}
                <span style={{ fontSize: '0.55em', color: 'var(--text-muted)', marginLeft: 5, fontWeight: 400 }}>/min</span>
              </div>
              <div className="mono muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
                ${fmt(burnRate.costPerHour, 2)}/hr
              </div>
            </>
          )}
        </div>

        {/* Threshold control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="label">alert&nbsp;$/min</span>
          <input
            type="number"
            value={threshold}
            min={0.001}
            step={0.01}
            onChange={e => onThresholdChange(parseFloat(e.target.value) || 0)}
            style={{
              width: 70,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${isOverThreshold ? 'var(--accent-danger)' : 'var(--card-border)'}`,
              borderRadius: 6,
              color: isOverThreshold ? 'var(--accent-danger)' : 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              padding: '3px 8px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Right: sparkline */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Sparkline
          data={sparklineData}
          modelSwitchPoints={modelSwitchPoints}
          isIdle={isIdle || !!error}
        />
      </div>
    </div>
  )
}
