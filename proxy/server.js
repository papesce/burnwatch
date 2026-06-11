import express from 'express'
import cors from 'cors'
import { readSince, setLabel, detectPlugins, bucketRows } from './store.js'
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

// /api/label — tag a session with a human-readable name
app.post('/api/label', (req, res) => {
  const { sessionId, label } = req.body ?? {}
  if (!sessionId) return res.status(400).json({ ok: false, error: 'sessionId required' })
  const ok = setLabel(sessionId, label ?? null)
  res.json({ ok })
})

app.listen(3777, '127.0.0.1', () => console.log('[burnwatch] proxy listening on http://127.0.0.1:3777'))
