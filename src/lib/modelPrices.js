// AWS Bedrock enterprise pricing (USD per 1M tokens), from plan/pricing.json.
export const MODEL_PRICES = {
  'aws/claude-sonnet-4-6':  { input: 1.7328, output:  8.664, cacheRead: 0.17328, cacheWrite: 2.166  },
  'aws/claude-sonnet-4-5':  { input: 1.7328, output:  8.664, cacheRead: 0.228,   cacheWrite: 2.85   },
  'claude-sonnet-4-6':      { input: 1.7328, output:  8.664, cacheRead: 0.17328, cacheWrite: 2.166  },
  'aws/claude-opus-4-8':    { input: 2.888,  output: 14.44,  cacheRead: 0.2888,  cacheWrite: 3.61   },
  'aws/claude-opus-4-7':    { input: 2.888,  output: 14.44,  cacheRead: 0.2888,  cacheWrite: 3.61   },
  'aws/claude-opus-4-6':    { input: 2.888,  output: 14.44,  cacheRead: 0.2888,  cacheWrite: 3.61   },
  'aws/claude-opus-4-5':    { input: 2.888,  output: 14.44,  cacheRead: 0.38,    cacheWrite: 4.75   },
  'aws/claude-opus-4-1':    { input: 8.664,  output: 43.32,  cacheRead: 1.14,    cacheWrite: 14.25  },
  'claude-opus-4-8':        { input: 2.888,  output: 14.44,  cacheRead: 0.2888,  cacheWrite: 3.61   },
  'claude-opus-4-7':        { input: 2.888,  output: 14.44,  cacheRead: 0.2888,  cacheWrite: 3.61   },
  'claude-opus-4-6':        { input: 2.888,  output: 14.44,  cacheRead: 0.2888,  cacheWrite: 3.61   },
  'aws/claude-haiku-4-5':   { input: 0.5776, output:  2.888, cacheRead: 0.076,   cacheWrite: 0.95   },
  'aws/claude-3-5-haiku':   { input: 0.4621, output:  2.310, cacheRead: 0.0608,  cacheWrite: 0.76   },
  'claude-haiku-4-5':       { input: 0.5776, output:  2.888, cacheRead: 0.076,   cacheWrite: 0.95   },
}

export const FALLBACK_PRICES =
  MODEL_PRICES['aws/claude-sonnet-4-6'] ?? MODEL_PRICES['claude-sonnet-4-6']

export function getPrices(modelId) {
  if (!modelId) return null
  if (MODEL_PRICES[modelId]) return MODEL_PRICES[modelId]
  const key = Object.keys(MODEL_PRICES)
    .filter(k => modelId.startsWith(k) || modelId.startsWith(k.replace(/^aws\//, '')))
    .sort((a, b) => b.length - a.length)[0]
  return key ? MODEL_PRICES[key] : null
}
