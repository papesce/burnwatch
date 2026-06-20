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
// AWS Bedrock enterprise pricing as of June 2026 (from plan/pricing.json).
// All values per-token (plan/pricing.json stores per-1M, divided here by 1e6).
const DEFAULTS = {
  // Sonnet 4.x
  'aws/claude-sonnet-4-6': { input: 1.7328/1e6, output: 8.664/1e6,  cacheWrite: 2.166/1e6,  cacheRead: 0.17328/1e6 },
  'aws/claude-sonnet-4-5': { input: 1.7328/1e6, output: 8.664/1e6,  cacheWrite: 2.85/1e6,   cacheRead: 0.228/1e6   },
  'claude-sonnet-4-6':     { input: 1.7328/1e6, output: 8.664/1e6,  cacheWrite: 2.166/1e6,  cacheRead: 0.17328/1e6 },
  // Opus 4.x
  'aws/claude-opus-4-8':   { input: 2.888/1e6,  output: 14.44/1e6,  cacheWrite: 3.61/1e6,   cacheRead: 0.2888/1e6  },
  'aws/claude-opus-4-7':   { input: 2.888/1e6,  output: 14.44/1e6,  cacheWrite: 3.61/1e6,   cacheRead: 0.2888/1e6  },
  'aws/claude-opus-4-6':   { input: 2.888/1e6,  output: 14.44/1e6,  cacheWrite: 3.61/1e6,   cacheRead: 0.2888/1e6  },
  'aws/claude-opus-4-5':   { input: 2.888/1e6,  output: 14.44/1e6,  cacheWrite: 4.75/1e6,   cacheRead: 0.38/1e6    },
  'aws/claude-opus-4-1':   { input: 8.664/1e6,  output: 43.32/1e6,  cacheWrite: 14.25/1e6,  cacheRead: 1.14/1e6    },
  'claude-opus-4-8':       { input: 2.888/1e6,  output: 14.44/1e6,  cacheWrite: 3.61/1e6,   cacheRead: 0.2888/1e6  },
  'claude-opus-4-7':       { input: 2.888/1e6,  output: 14.44/1e6,  cacheWrite: 3.61/1e6,   cacheRead: 0.2888/1e6  },
  'claude-opus-4-6':       { input: 2.888/1e6,  output: 14.44/1e6,  cacheWrite: 3.61/1e6,   cacheRead: 0.2888/1e6  },
  // Haiku 4.x
  'aws/claude-3-5-haiku':  { input: 0.46208/1e6, output: 2.3104/1e6, cacheWrite: 0.76/1e6,  cacheRead: 0.0608/1e6  },
  'aws/claude-haiku-4-5':  { input: 0.5776/1e6,  output: 2.888/1e6,  cacheWrite: 0.95/1e6,  cacheRead: 0.076/1e6   },
  'claude-haiku-4-5':      { input: 0.5776/1e6,  output: 2.888/1e6,  cacheWrite: 0.95/1e6,  cacheRead: 0.076/1e6   },
  // Fable 5 / Mythos 5 (no enterprise pricing yet, use public rates)
  'claude-fable-5':        { input: 10/1e6,  output: 50/1e6,  cacheWrite: 12.5/1e6,  cacheRead: 1/1e6    },
  'claude-mythos-5':       { input: 10/1e6,  output: 50/1e6,  cacheWrite: 12.5/1e6,  cacheRead: 1/1e6    },
  // Fallback (sonnet-4-6 enterprise rate)
  'default':               { input: 1.7328/1e6, output: 8.664/1e6, cacheWrite: 2.166/1e6, cacheRead: 0.17328/1e6 },
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
