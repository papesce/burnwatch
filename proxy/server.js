import { execFile } from 'node:child_process'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())

function runCcusage(args) {
  return new Promise((resolve, reject) => {
    execFile('ccusage', args, { timeout: 10_000 }, (err, stdout) => {
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

  res.json({ ok: true, ts, block: normaliseBlock(active) })
})

app.listen(3777, () => console.log('proxy listening on http://localhost:3777'))
