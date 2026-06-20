import { useState } from 'react'

const LS_KEY = 'burnwatch-projects-open'

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return Math.round(n).toString()
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)                  return `${s}s ago`
  if (s < 3600)                return `${Math.floor(s / 60)}m ago`
  if (s < 86400)               return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 2)           return 'yesterday'
  if (s < 86400 * 7)           return `${Math.floor(s / 86400)}d ago`
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function CostRow({ name, sessions, tokens, costUSD, lastSeenTs }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto auto auto auto',
      gap: '0 16px',
      alignItems: 'baseline',
      padding: '4px 0',
      borderBottom: '1px solid var(--card-border)',
    }}>
      <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      <span className="mono muted" style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
        {sessions} {sessions === 1 ? 'session' : 'sessions'}
      </span>
      <span className="mono muted" style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
        {fmtNum(tokens)} tok
      </span>
      <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', whiteSpace: 'nowrap' }}>
        ${costUSD.toFixed(2)}
      </span>
      <span className="mono muted" style={{ fontSize: '0.62rem', whiteSpace: 'nowrap', opacity: 0.55 }}>
        {lastSeenTs ? timeAgo(lastSeenTs) : '—'}
      </span>
    </div>
  )
}

export default function ProjectCosts({ projects = [] }) {
  const [open, setOpen] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'false') } catch (_) { return false }
  })

  const toggle = () => {
    const next = !open
    setOpen(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch (_) {}
  }

  return (
    <div className="glass-card" style={{ padding: '0' }}>
      {/* Toggle header */}
      <button
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '10px 24px',
          color: 'var(--text-primary)',
          textAlign: 'left',
        }}
      >
        <span
          className="mono muted"
          style={{
            fontSize: '0.7rem',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            display: 'inline-block',
          }}
        >▶</span>
        <span className="label">project costs</span>
        <span style={{ flex: 1 }} />
        <span className="mono muted" style={{ fontSize: '0.62rem', opacity: 0.6 }}>30d</span>
      </button>

      {/* Collapsible body */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '600px' : '0px',
        transition: 'max-height 0.25s ease',
      }}>
        <div style={{ padding: '4px 24px 16px' }}>
          {/* By project */}
          <div className="label" style={{ marginBottom: 8, fontSize: '0.6rem', opacity: 0.6 }}>by project</div>
          {projects.length === 0 ? (
            <div className="mono muted" style={{ fontSize: '0.7rem', paddingBottom: 8 }}>no data yet</div>
          ) : (
            projects.map(p => (
              <CostRow key={p.fullPath} name={p.project} sessions={p.sessions} tokens={p.tokens} costUSD={p.costUSD} lastSeenTs={p.lastSeenTs} />
            ))
          )}

        </div>
      </div>
    </div>
  )
}
