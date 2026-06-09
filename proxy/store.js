import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT      = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR  = join(ROOT, '.data')
const DATA_FILE = join(DATA_DIR, 'snapshots.ndjson')
const TTL_MS    = 24 * 60 * 60 * 1000   // 24 hours
const PRUNE_GAP = 10 * 60 * 1000        // prune at most once per 10 min

mkdirSync(DATA_DIR, { recursive: true })
if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, '', 'utf8')

let lastPrune = 0

export function appendSnapshot(block, ts) {
  const row = {
    ts,
    sessionId:   block.id ?? 'unknown',
    costUSD:     block.costUSD,
    totalTokens: block.totalTokens,
    inputTokens: block.inputTokens,
    outputTokens: block.outputTokens,
    cacheCreate: block.cacheCreationTokens,
    cacheRead:   block.cacheReadTokens,
    burnCostHr:  block.burnRate.costPerHour,
    burnTokMin:  block.burnRate.tokensPerMinute,
    models:      block.models,
    label:       null,
  }
  appendFileSync(DATA_FILE, JSON.stringify(row) + '\n', 'utf8')
  maybePrune(ts)
}

function maybePrune(now) {
  if (now - lastPrune < PRUNE_GAP) return
  lastPrune = now
  try {
    const rows = parseFile()
    const fresh = rows.filter(r => now - r.ts <= TTL_MS)
    if (fresh.length < rows.length) {
      writeFileSync(DATA_FILE, fresh.map(r => JSON.stringify(r)).join('\n') + (fresh.length ? '\n' : ''), 'utf8')
    }
  } catch (_) { /* non-fatal — bad prune just leaves stale rows */ }
}

function parseFile() {
  try {
    return readFileSync(DATA_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
  } catch (_) { return [] }
}

export function readSince(sinceMs) {
  return parseFile().filter(r => r.ts >= sinceMs)
}

export function setLabel(sessionId, label) {
  try {
    const rows = parseFile().map(r =>
      r.sessionId === sessionId ? { ...r, label } : r
    )
    writeFileSync(DATA_FILE, rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), 'utf8')
    return true
  } catch (_) { return false }
}

export function detectPlugins() {
  try {
    const cfgPath = join(process.env.HOME ?? '~', '.claude', 'settings.json')
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
    return Object.keys(cfg?.mcpServers ?? {})
  } catch (_) { return [] }
}

// Groups raw rows into time buckets. Returns one point per bucket with
// delta tokens/cost (consumed within the window) and avg burn rates.
export function bucketRows(rows, bucketMs) {
  if (!rows.length) return []

  // Group rows into buckets keyed by bucket-start timestamp
  const map = new Map()
  for (const r of rows) {
    const key = Math.floor(r.ts / bucketMs) * bucketMs
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(r)
  }

  const buckets = []
  for (const [ts, group] of [...map.entries()].sort((a, b) => a[0] - b[0])) {
    const first = group[0]
    const last  = group[group.length - 1]

    // delta: tokens/cost consumed within this bucket (not cumulative total)
    const tokens  = Math.max(0, last.totalTokens - first.totalTokens)
    const costUSD = Math.max(0, last.costUSD - first.costUSD)

    const burnTokMin = group.reduce((s, r) => s + r.burnTokMin, 0) / group.length
    const burnCostHr = group.reduce((s, r) => s + r.burnCostHr, 0) / group.length

    // Collect unique models seen in this bucket
    const modelSet = new Set(group.flatMap(r => r.models))

    buckets.push({ ts, tokens, costUSD, burnTokMin, burnCostHr, models: [...modelSet] })
  }

  return buckets
}
