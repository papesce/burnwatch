// Reads Claude Code JSONL conversation logs from ~/.claude/projects/
// and returns per-request entries with timestamp, model, token counts, and cost.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { calcCost } from './pricing.js'

const CLAUDE_DIR = join(process.env.HOME ?? '~', '.claude', 'projects')
const TTL_MS     = 24 * 60 * 60 * 1000

// Returns sorted array of { ts, model, sessionId, inputTokens, outputTokens,
//   cacheCreationTokens, cacheReadTokens, costUSD } for all assistant turns
// within [sinceMs, now] across all projects.
export function readEntries(sinceMs = Date.now() - TTL_MS) {
  const entries = []

  let projects
  try { projects = readdirSync(CLAUDE_DIR) } catch (_) { return [] }

  for (const proj of projects) {
    const projDir = join(CLAUDE_DIR, proj)
    let files
    try {
      const stat = statSync(projDir)
      if (!stat.isDirectory()) continue
      files = readdirSync(projDir).filter(f => f.endsWith('.jsonl'))
    } catch (_) { continue }

    for (const file of files) {
      const filePath = join(projDir, file)

      // Skip files not touched since sinceMs (fast path)
      try {
        const { mtimeMs } = statSync(filePath)
        if (mtimeMs < sinceMs) continue
      } catch (_) { continue }

      let raw
      try { raw = readFileSync(filePath, 'utf8') } catch (_) { continue }

      for (const line of raw.split('\n')) {
        if (!line) continue
        let r
        try { r = JSON.parse(line) } catch (_) { continue }

        if (r.type !== 'assistant') continue
        if (!r.timestamp || !r.message?.usage) continue

        const ts = new Date(r.timestamp).getTime()
        if (ts < sinceMs) continue

        const model   = r.message.model ?? 'unknown'
        const usage   = r.message.usage
        const costUSD = calcCost(model, usage)

        entries.push({
          ts,
          model,
          sessionId:            r.sessionId ?? file.replace('.jsonl', ''),
          inputTokens:          usage.input_tokens                ?? 0,
          outputTokens:         usage.output_tokens               ?? 0,
          cacheCreationTokens:  usage.cache_creation_input_tokens ?? 0,
          cacheReadTokens:      usage.cache_read_input_tokens     ?? 0,
          costUSD,
        })
      }
    }
  }

  entries.sort((a, b) => a.ts - b.ts)
  return entries
}

// Aggregates entries into a running cumulative snapshot stream, one point per
// entry. totalTokens and totalCostUSD are cumulative within the current
// billing block (resets when a gap > gapMs is detected between entries).
export function toSnapshots(entries, gapMs = 5 * 60 * 1000) {
  if (!entries.length) return []

  const snaps = []
  let cumTokens = 0
  let cumCost   = 0
  let prevTs    = null

  for (const e of entries) {
    // Reset cumulative counters on a long gap (new billing block)
    if (prevTs !== null && e.ts - prevTs > gapMs) {
      cumTokens = 0
      cumCost   = 0
    }
    prevTs = e.ts

    const tokens = e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
    cumTokens += tokens
    cumCost   += e.costUSD

    snaps.push({
      ts:                   e.ts,
      sessionId:            e.sessionId,
      model:                e.model,
      totalTokens:          cumTokens,
      costUSD:              cumCost,
      inputTokens:          e.inputTokens,
      outputTokens:         e.outputTokens,
      cacheCreationTokens:  e.cacheCreationTokens,
      cacheReadTokens:      e.cacheReadTokens,
    })
  }

  return snaps
}

// Returns the active session: the most recent contiguous run of entries
// (no gap > gapMs from the last entry).
export function activeBlock(entries, gapMs = 5 * 60 * 1000) {
  if (!entries.length) return null

  const now  = Date.now()
  const last = entries[entries.length - 1]

  // Last entry too old — no active session
  if (now - last.ts > gapMs) return null

  // Walk backwards to find block start
  let startIdx = entries.length - 1
  while (startIdx > 0 && entries[startIdx].ts - entries[startIdx - 1].ts <= gapMs) {
    startIdx--
  }

  const block = entries.slice(startIdx)

  const totalTokens = block.reduce((s, e) =>
    s + e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens, 0)
  const costUSD     = block.reduce((s, e) => s + e.costUSD, 0)
  const models      = [...new Set(block.map(e => e.model).filter(m => m && !m.startsWith('<')))]

  const durationMs  = last.ts - block[0].ts
  const durationMin = durationMs / 60_000

  return {
    id:                   last.sessionId,
    startTime:            new Date(block[0].ts).toISOString(),
    isActive:             true,
    totalTokens,
    costUSD,
    models,
    inputTokens:          block.reduce((s, e) => s + e.inputTokens, 0),
    outputTokens:         block.reduce((s, e) => s + e.outputTokens, 0),
    cacheCreationTokens:  block.reduce((s, e) => s + e.cacheCreationTokens, 0),
    cacheReadTokens:      block.reduce((s, e) => s + e.cacheReadTokens, 0),
    burnRate: {
      tokensPerMinute:             durationMin > 0 ? totalTokens / durationMin : 0,
      costPerHour:                 durationMin > 0 ? (costUSD / durationMin) * 60 : 0,
      tokensPerMinuteForIndicator: durationMin > 0 ? totalTokens / durationMin : 0,
    },
  }
}
