import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readEntries } from './jsonl.js'

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, '.data')
const LABEL_FILE = join(DATA_DIR, 'labels.json')

mkdirSync(DATA_DIR, { recursive: true })

// ── Labels (session id → string) ────────────────────────────────────────────

function readLabels() {
  try { return JSON.parse(readFileSync(LABEL_FILE, 'utf8')) } catch (_) { return {} }
}

function writeLabels(map) {
  writeFileSync(LABEL_FILE, JSON.stringify(map, null, 2), 'utf8')
}

export function setLabel(sessionId, label) {
  try {
    const map = readLabels()
    if (label) map[sessionId] = label
    else delete map[sessionId]
    writeLabels(map)
    return true
  } catch (_) { return false }
}

// ── History ──────────────────────────────────────────────────────────────────

// Returns JSONL entries since sinceMs, with label attached where available.
export function readSince(sinceMs) {
  const labels  = readLabels()
  const entries = readEntries(sinceMs)
  return entries.map(e => ({ ...e, label: labels[e.sessionId] ?? null }))
}

// Groups raw entries into time buckets with delta tokens/cost per bucket.
// Empty buckets within [sinceMs, now] are filled with zero values for a
// continuous time axis.
export function bucketRows(entries, bucketMs, sinceMs) {
  const now         = Date.now()
  const windowStart = sinceMs ?? (entries.length ? entries[0].ts : now - bucketMs)

  // Build running cumulative totals so we can compute deltas per bucket
  // Each entry contributes its own token counts (they are per-request, not cumulative)
  const map = new Map()
  for (const e of entries) {
    const key = Math.floor(e.ts / bucketMs) * bucketMs
    if (!map.has(key)) map.set(key, { tokens: 0, costUSD: 0, models: new Set() })
    const b = map.get(key)
    b.tokens  += e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
    b.costUSD += e.costUSD
    b.models.add(e.model)
  }

  // Fill every slot from windowStart to now
  const firstSlot = Math.floor(windowStart / bucketMs) * bucketMs
  const lastSlot  = Math.floor(now / bucketMs) * bucketMs
  for (let ts = firstSlot; ts <= lastSlot; ts += bucketMs) {
    if (!map.has(ts)) map.set(ts, { tokens: 0, costUSD: 0, models: new Set() })
  }

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, b]) => ({
      ts,
      tokens:  b.tokens,
      costUSD: b.costUSD,
      models:  [...b.models],
    }))
}

// ── Misc ─────────────────────────────────────────────────────────────────────

export function detectPlugins() {
  try {
    const cfgPath = join(process.env.HOME ?? '~', '.claude', 'settings.json')
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
    return Object.keys(cfg?.mcpServers ?? {})
  } catch (_) { return [] }
}
