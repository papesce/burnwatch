// All prices in USD per 1M tokens
export const MODEL_PRICES = {
  'claude-opus-4':           { input: 15.00, output: 75.00, cacheRead: 1.50,  cacheWrite: 18.75 },
  'claude-opus-4-8':         { input: 15.00, output: 75.00, cacheRead: 1.50,  cacheWrite: 18.75 },
  'claude-sonnet-4-5':       { input:  3.00, output: 15.00, cacheRead: 0.30,  cacheWrite:  3.75 },
  'claude-sonnet-4-6':       { input:  3.00, output: 15.00, cacheRead: 0.30,  cacheWrite:  3.75 },
  'claude-haiku-4-5':        { input:  0.80, output:  4.00, cacheRead: 0.08,  cacheWrite:  1.00 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00, cacheRead: 0.08,  cacheWrite:  1.00 },
  'claude-opus-3-7':         { input: 15.00, output: 75.00, cacheRead: 1.50,  cacheWrite: 18.75 },
  'claude-sonnet-3-5':       { input:  3.00, output: 15.00, cacheRead: 0.30,  cacheWrite:  3.75 },
  'claude-haiku-3-5':        { input:  0.80, output:  4.00, cacheRead: 0.08,  cacheWrite:  1.00 },
}

export const FALLBACK_PRICES = MODEL_PRICES['claude-sonnet-4-6']

export function getPrices(modelId) {
  if (!modelId) return null
  if (MODEL_PRICES[modelId]) return MODEL_PRICES[modelId]
  // Prefix match handles versioned IDs like claude-haiku-4-5-20251001
  const base = Object.keys(MODEL_PRICES).find(k => modelId.startsWith(k))
  return base ? MODEL_PRICES[base] : null
}
