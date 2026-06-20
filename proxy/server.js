import express from 'express'
import cors from 'cors'
import { readSince, readLabels, setLabel, detectPlugins, bucketRows } from './store.js'
import { readEntries, activeBlock } from './jsonl.js'

const VITE_ORIGIN = process.env.VITE_ORIGIN ?? 'http://localhost:5777'

const app = express()
app.use(cors({ origin: VITE_ORIGIN }))
app.use(express.json())

const BUCKET_MS = {
  '2s': 2_000, '5s': 5_000, '10s': 10_000, '30s': 30_000,
  '1m': 60_000, '2m': 120_000, '5m': 300_000, '12m': 720_000,
  '48m': 2_880_000, '1h': 3_600_000,
}

// /api/usage — current active block, same shape as before so the client needs no changes
app.get('/api/usage', (req, res) => {
  const ts      = Date.now()
  const since   = ts - 24 * 60 * 60 * 1000
  const entries = readEntries(since)
  const block   = activeBlock(entries)

  if (!block) return res.json({ ok: true, ts, block: null })
  res.json({ ok: true, ts, block })
})

// /api/history — bucketed token history for the chart
app.get('/api/history', (req, res) => {
  const resolution = BUCKET_MS[req.query.resolution] ? req.query.resolution : '1m'
  const since      = parseInt(req.query.since) || (Date.now() - 3_600_000)
  const entries    = readSince(since)
  const bucketed   = bucketRows(entries, BUCKET_MS[resolution], since)
  res.json({ ok: true, rows: bucketed, plugins: detectPlugins() })
})

// /api/totals — daily / weekly / monthly aggregate (60s server-side cache)
let totalsCache = null

app.get('/api/totals', (req, res) => {
  const now = Date.now()
  if (totalsCache && now - totalsCache.ts < 60_000)
    return res.json({ ok: true, ...totalsCache.data })

  const todayStart   = new Date().setHours(0, 0, 0, 0)
  const week7Start   = todayStart - 6  * 24 * 60 * 60 * 1000
  const month30Start = todayStart - 29 * 24 * 60 * 60 * 1000

  const entries = readEntries(month30Start)

  function agg(since) {
    let tokens = 0, costUSD = 0
    for (const e of entries) {
      if (e.ts < since) continue
      tokens  += e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
      costUSD += e.costUSD
    }
    return { tokens, costUSD }
  }

  const data = { today: agg(todayStart), week: agg(week7Start), month: agg(month30Start) }
  totalsCache = { ts: now, data }
  res.json({ ok: true, ...data })
})

// /api/estimates — windowed avg burn rates (15s cache)
let estimatesCache = null

app.get('/api/estimates', (req, res) => {
  const now = Date.now()
  if (estimatesCache && now - estimatesCache.ts < 15_000)
    return res.json({ ok: true, ...estimatesCache.data })

  const win5m  = now -  5 * 60_000
  const win15m = now - 15 * 60_000
  const win1h  = now - 60 * 60_000
  const win6h  = now -  6 * 60 * 60_000
  const win24h = now - 24 * 60 * 60_000

  const entries = readEntries(win24h)

  function avgPerMin(since) {
    let cost = 0
    for (const e of entries) {
      if (e.ts < since) continue
      cost += e.costUSD
    }
    const windowMin = (now - since) / 60_000
    return windowMin > 0 ? cost / windowMin : 0
  }

  const data = { avg5m: avgPerMin(win5m), avg15m: avgPerMin(win15m), avg1h: avgPerMin(win1h), avg6h: avgPerMin(win6h), avg24h: avgPerMin(win24h) }
  estimatesCache = { ts: now, data }
  res.json({ ok: true, ...data })
})

// /api/projects — per-project and per-label rollups (30s cache)
let projectsCache = null

app.get('/api/projects', (req, res) => {
  const now = Date.now()
  if (projectsCache && now - projectsCache.ts < 30_000)
    return res.json({ ok: true, ...projectsCache.data })

  const since   = now - 30 * 24 * 60 * 60_000
  const entries = readEntries(since)
  const labelsMap = readLabels()
  const enriched  = entries.map(e => ({ ...e, label: labelsMap[e.sessionId] ?? null }))

  const byProj  = new Map()
  const byLabel = new Map()

  for (const e of enriched) {
    const key = e.project ?? 'unknown'
    if (!byProj.has(key)) byProj.set(key, { sessions: new Set(), costUSD: 0, tokens: 0, lastSeenTs: 0 })
    const gp = byProj.get(key)
    gp.sessions.add(e.sessionId)
    gp.costUSD += e.costUSD
    gp.tokens  += e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
    gp.lastSeenTs = Math.max(gp.lastSeenTs, e.ts)

    if (e.label) {
      if (!byLabel.has(e.label)) byLabel.set(e.label, { sessions: new Set(), costUSD: 0, tokens: 0, lastSeenTs: 0 })
      const gl = byLabel.get(e.label)
      gl.sessions.add(e.sessionId)
      gl.costUSD += e.costUSD
      gl.tokens  += e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
      gl.lastSeenTs = Math.max(gl.lastSeenTs, e.ts)
    }
  }

  const decodeProj = proj => {
    const parts = proj.replace(/^-/, '').split('-').filter(Boolean)
    return parts.slice(-2).join('/') || proj
  }

  const projects = [...byProj.entries()]
    .map(([key, g]) => ({ project: decodeProj(key), fullPath: key, sessions: g.sessions.size, costUSD: g.costUSD, tokens: g.tokens, lastSeenTs: g.lastSeenTs }))
    .sort((a, b) => b.lastSeenTs - a.lastSeenTs)

  const labels = [...byLabel.entries()]
    .map(([label, g]) => ({ label, sessions: g.sessions.size, costUSD: g.costUSD, tokens: g.tokens, lastSeenTs: g.lastSeenTs }))
    .sort((a, b) => b.lastSeenTs - a.lastSeenTs)

  const data = { projects, labels }
  projectsCache = { ts: now, data }
  res.json({ ok: true, ...data })
})

// /api/label — tag a session with a human-readable name
app.post('/api/label', (req, res) => {
  const { sessionId, label } = req.body ?? {}
  if (!sessionId) return res.status(400).json({ ok: false, error: 'sessionId required' })
  const ok = setLabel(sessionId, label ?? null)
  res.json({ ok })
})

app.listen(3777, '127.0.0.1', () => console.log('[burnwatch] proxy listening on http://127.0.0.1:3777'))
