# BurnWatch

Real-time Claude API token usage dashboard. Polls `ccusage` and visualises burn rate, session totals, and cost per minute with a live sparkline.

## Prerequisites

- Node.js 18+
- `ccusage` installed globally:
  ```bash
  npm i -g ccusage
  ```

## Install

```bash
cd dashboard
npm install
```

## Dev

```bash
npm run dev
```

Opens at http://localhost:5173. The Express proxy starts on port 3001 automatically via `concurrently`.

## Build

```bash
npm run build   # output in dist/
npm run preview # serve the build locally
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Pause / resume polling |
| `+` / `-` | Increase / decrease poll interval |
| `D` | Toggle dark / light mode |

## ccusage JSON shape assumptions

The proxy calls `ccusage blocks --active --json` and expects a response shaped like:

```json
{
  "blocks": [{
    "isActive": true,
    "costUSD": 1.23,
    "totalTokens": 500000,
    "tokenCounts": {
      "inputTokens": 10000,
      "outputTokens": 5000,
      "cacheCreationInputTokens": 200000,
      "cacheReadInputTokens": 285000
    },
    "models": ["claude-sonnet-4-6"],
    "burnRate": {
      "costPerHour": 2.5,
      "tokensPerMinute": 8000,
      "tokensPerMinuteForIndicator": 133.3
    }
  }]
}
```

If your version of `ccusage` returns a different shape, adjust `normaliseBlock()` in `proxy/server.js`.
