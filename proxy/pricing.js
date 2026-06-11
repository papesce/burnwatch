// Per-token pricing in USD.
// Override for enterprise plans via BURNWATCH_PRICING env var (JSON) or a
// pricing.json file next to this file.
//
// Keys are model id prefixes (longest match wins).
// All values are per-token (not per-million).
//
// Default rates are standard Anthropic public pricing as of June 2026.

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))

// Standard public pricing as of June 2026 — per token (not per million).
// cacheWrite = 5-minute cache write rate (1.25x input).
// For enterprise plans, override in pricing.json or BURNWATCH_PRICING env var.
const DEFAULTS = {
  // Fable 5 / Mythos 5
  'claude-fable-5':   { input: 10/1e6,  output: 50/1e6,  cacheWrite: 12.5/1e6,  cacheRead: 1/1e6    },
  'claude-mythos-5':  { input: 10/1e6,  output: 50/1e6,  cacheWrite: 12.5/1e6,  cacheRead: 1/1e6    },
  // Opus 4.x (4.5+): $5/$25
  'claude-opus-4-8':  { input: 5/1e6,   output: 25/1e6,  cacheWrite: 6.25/1e6,  cacheRead: 0.5/1e6  },
  'claude-opus-4-7':  { input: 5/1e6,   output: 25/1e6,  cacheWrite: 6.25/1e6,  cacheRead: 0.5/1e6  },
  'claude-opus-4-6':  { input: 5/1e6,   output: 25/1e6,  cacheWrite: 6.25/1e6,  cacheRead: 0.5/1e6  },
  'claude-opus-4-5':  { input: 5/1e6,   output: 25/1e6,  cacheWrite: 6.25/1e6,  cacheRead: 0.5/1e6  },
  // Opus 4.0/4.1 (deprecated): $15/$75
  'claude-opus-4':    { input: 15/1e6,  output: 75/1e6,  cacheWrite: 18.75/1e6, cacheRead: 1.5/1e6  },
  // Sonnet 4.x: $3/$15
  'claude-sonnet-4':  { input: 3/1e6,   output: 15/1e6,  cacheWrite: 3.75/1e6,  cacheRead: 0.3/1e6  },
  // Haiku 4.5: $1/$5
  'claude-haiku-4':   { input: 1/1e6,   output: 5/1e6,   cacheWrite: 1.25/1e6,  cacheRead: 0.1/1e6  },
  // Haiku 3.5: $0.80/$4
  'claude-haiku-3':   { input: 0.8/1e6, output: 4/1e6,   cacheWrite: 1/1e6,     cacheRead: 0.08/1e6 },
  // Fallback
  'default':          { input: 3/1e6,   output: 15/1e6,  cacheWrite: 3.75/1e6,  cacheRead: 0.3/1e6  },
}

function loadOverrides() {
  // 1. Env var: BURNWATCH_PRICING='{"claude-sonnet-4":{"input":0,"output":0,...}}'
  if (process.env.BURNWATCH_PRICING) {
    try { return JSON.parse(process.env.BURNWATCH_PRICING) } catch (_) {}
  }
  // 2. pricing.json next to this file
  const p = join(DIR, 'pricing.json')
  if (existsSync(p)) {
    try { return JSON.parse(readFileSync(p, 'utf8')) } catch (_) {}
  }
  return {}
}

const TABLE = { ...DEFAULTS, ...loadOverrides() }

export function priceFor(model) {
  // longest prefix match
  const key = Object.keys(TABLE)
    .filter(k => k !== 'default' && model.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return TABLE[key] ?? TABLE['default']
}

export function calcCost(model, usage) {
  const p = priceFor(model)
  return (
    (usage.input_tokens              ?? 0) * p.input      +
    (usage.output_tokens             ?? 0) * p.output     +
    (usage.cache_creation_input_tokens ?? 0) * p.cacheWrite +
    (usage.cache_read_input_tokens   ?? 0) * p.cacheRead
  )
}
