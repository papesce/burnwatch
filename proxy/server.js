import { execFile, execFileSync } from 'node:child_process'
import express from 'express'
import cors from 'cors'
import { appendSnapshot, readSince, setLabel, detectPlugins, bucketRows } from './store.js'

const VITE_ORIGIN = process.env.VITE_ORIGIN ?? 'http://localhost:5777'

const app = express()
app.use(cors({ origin: VITE_ORIGIN }))

// Resolve full path at startup so nvm/volta/etc. installs are found
// even when the proxy is launched from a shell without the full user PATH.
function resolveCcusage() {
  const candidates = [
    process.env.CCUSAGE_BIN,
    ...( process.env.PATH?.split(':') ?? [] ).map(d => `${d}/ccusage`),
    `${process.env.HOME}/.nvm/versions/node/v22.16.0/bin/ccusage`,
    `${process.env.HOME}/.volta/bin/ccusage`,
  ]
  for (const p of candidates) {
    if (!p) continue
    try { execFileSync(p, ['--version'], { stdio: 'ignore' }); return p } catch (_) { /* try next */ }
  }
  return null
}

const CCUSAGE_BIN = resolveCcusage()
if (!CCUSAGE_BIN) {
  console.error('[burnwatch] ccusage not found — install with: npm i -g ccusage')
  process.exit(1)
}
console.log(`[burnwatch] ccusage resolved → ${CCUSAGE_BIN}`)

function runCcusage(args) {
  if (!CCUSAGE_BIN) return Promise.reject(new Error('ccusage not found'))
  return new Promise((resolve, reject) => {
    execFile(CCUSAGE_BIN, args, { timeout: 10_000 }, (err, stdout) => {
      if (err) return reject(err)
      try { resolve(JSON.parse(stdout)) }
      catch (e) { reject(new Error('JSON parse failed: ' + stdout.slice(0, 120))) }
    })
  })
}

function normaliseBlock(raw) {
  if (!raw) return null
  return {
    id:                   raw.id,
    startTime:            raw.startTime,
    costUSD:              raw.costUSD ?? 0,
    totalTokens:          raw.totalTokens ?? 0,
    inputTokens:          raw.tokenCounts?.inputTokens ?? 0,
    outputTokens:         raw.tokenCounts?.outputTokens ?? 0,
    cacheCreationTokens:  raw.tokenCounts?.cacheCreationInputTokens ?? 0,
    cacheReadTokens:      raw.tokenCounts?.cacheReadInputTokens ?? 0,
    models:               raw.models ?? [],
    burnRate: {
      costPerHour:               raw.burnRate?.costPerHour ?? 0,
      tokensPerMinute:           raw.burnRate?.tokensPerMinute ?? 0,
      tokensPerMinuteForIndicator: raw.burnRate?.tokensPerMinuteForIndicator ?? 0,
    },
  }
}

app.get('/api/usage', async (req, res) => {
  const ts = Date.now()
  let data

  // Try blocks --active first, fall back to session --active
  for (const args of [['blocks', '--active', '--json'], ['session', '--active', '--json']]) {
    try { data = await runCcusage(args); break } catch (_) { /* try next */ }
  }

  if (!data) {
    return res.json({ ok: false, ts, block: null, error: 'ccusage not found or failed — run: npm i -g ccusage' })
  }

  const blocks = data.blocks ?? (data.block ? [data.block] : [data])
  const active = blocks.find(b => b.isActive) ?? blocks[0] ?? null

  const normalised = normaliseBlock(active)
  if (normalised) appendSnapshot(normalised, ts)
  res.json({ ok: true, ts, block: normalised })
})

const BUCKET_MS = { '2s': 2_000, '5s': 5_000, '10s': 10_000, '30s': 30_000, '1m': 60_000, '2m': 120_000, '5m': 300_000, '12m': 720_000, '48m': 2_880_000, '1h': 3_600_000 }

app.get('/api/history', (req, res) => {
  const resolution = BUCKET_MS[req.query.resolution] ? req.query.resolution : '1m'
  const since      = parseInt(req.query.since) || (Date.now() - 3_600_000)
  const rows       = readSince(since)
  const bucketed   = bucketRows(rows, BUCKET_MS[resolution], since)
  res.json({ ok: true, rows: bucketed, plugins: detectPlugins() })
})

app.use(express.json())
app.post('/api/label', (req, res) => {
  const { sessionId, label } = req.body ?? {}
  if (!sessionId) return res.status(400).json({ ok: false, error: 'sessionId required' })
  const ok = setLabel(sessionId, label ?? null)
  res.json({ ok })
})

app.listen(3777, '127.0.0.1', () => console.log('proxy listening on http://127.0.0.1:3777'))
