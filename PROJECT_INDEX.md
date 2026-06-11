# Project Index: BurnWatch

Generated: 2026-06-10

## Overview

Real-time Claude token burn rate dashboard. Reads Claude Code JSONL logs directly (no `ccusage` dependency) and shows live burn rate, cost, session totals, and a history chart with per-model color coding.

**Ports:** Proxy `3777` · Vite dev server `5777`

---

## Entry Points

| Path | Role |
|------|------|
| `src/main.jsx` | React mount (renders `<App />` into `#root`) |
| `proxy/server.js` | Express proxy — all `/api/*` routes |
| `burn.sh` | CLI: `install`, `open`, `kill`, `restart`, `build`, `setup`, `uninstall` |
| `index.html` | Vite HTML shell |

---

## Directory Structure

```
burnwatch/
├── proxy/
│   ├── server.js        Express routes (/api/usage, /api/history, /api/label)
│   ├── store.js         readSince(), bucketRows(), detectPlugins(), setLabel()
│   ├── jsonl.js         readEntries(), toSnapshots(), activeBlock()
│   ├── pricing.js       priceFor(), calcCost() — prefix-match model pricing
│   └── pricing.json.example  Template for enterprise pricing overrides
├── src/
│   ├── App.jsx          Root layout + keyboard shortcuts + toast alerts
│   ├── main.jsx         React 19 mount
│   ├── index.css        CSS vars, dark/light theme, grid layout
│   ├── components/
│   │   ├── BurnGauge.jsx     History chart: SVG rolling bars + range picker (440 LOC)
│   │   ├── BurnRateHero.jsx  Large burn rate number + Sparkline
│   │   ├── SessionTotals.jsx Token breakdown by type + model badges
│   │   ├── DeltaCard.jsx     Per-poll token/cost delta
│   │   ├── StatusBar.jsx     Latency, interval, pause/play controls
│   │   ├── Banner.jsx        Logo + theme toggle
│   │   ├── Sparkline.jsx     Mini recharts LineChart
│   │   └── Logo.jsx          SVG logo
│   ├── hooks/
│   │   ├── useUsageStore.js  Main polling store (snapshots[], burnRate, delta)
│   │   └── useHistoryStore.js  History fetch store (rows[], range, barCount)
│   └── lib/
│       ├── calcBurnRate.js   60s sliding window burn rate calc
│       └── modelPrices.js    Front-end model price table (legacy, server-side is authoritative)
├── .data/
│   └── labels.json      Session id → label map (persisted)
└── dist/                Vite build output
```

---

## API Routes (proxy/server.js)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/usage` | Active session block (null if idle >5m) |
| GET | `/api/history?resolution=&since=` | Bucketed token rows for chart |
| POST | `/api/label` | `{ sessionId, label }` — tag a session |

**`/api/usage` response shape:**
```json
{ "ok": true, "ts": 1234567890, "block": {
  "id": "session-id", "isActive": true,
  "totalTokens": 50000, "costUSD": 0.15,
  "models": ["claude-sonnet-4-6"],
  "inputTokens": 10000, "outputTokens": 5000,
  "cacheCreationTokens": 20000, "cacheReadTokens": 15000,
  "burnRate": { "tokensPerMinute": 1000, "costPerHour": 0.50, "tokensPerMinuteForIndicator": 1000 }
}}
```

---

## Data Flow

```
~/.claude/projects/**/*.jsonl
        │
        ▼
proxy/jsonl.js::readEntries(sinceMs)
   → per-request rows: {ts, model, sessionId, inputTokens, outputTokens, cacheCreation, cacheRead, costUSD}
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
activeBlock()              store.js::bucketRows()
  → active session block     → time-bucketed rows (filled, zero-padded)
        │                             │
        ▼                             ▼
  GET /api/usage            GET /api/history
        │                             │
        ▼                             ▼
useUsageStore (snapshots)     useHistoryStore (rows)
        │                             │
        ▼                             ▼
BurnRateHero/SessionTotals     BurnGauge (SVG bars)
```

---

## Key Modules

### proxy/jsonl.js (157 LOC)
- `readEntries(sinceMs)` — scans all `~/.claude/projects/**/*.jsonl`, returns per-request entries. Skips files with `mtime < sinceMs`.
- `activeBlock(entries, gapMs=5m)` — most recent contiguous run; returns null if last entry >5m ago.
- `toSnapshots(entries, gapMs=5m)` — cumulative running totals, resets on gap.

### proxy/store.js (85 LOC)
- `bucketRows(entries, bucketMs, sinceMs)` — groups entries into fixed-width time buckets, zero-fills full window.
- `readSince(sinceMs)` — readEntries + label join.
- `detectPlugins()` — reads `~/.claude/settings.json`, returns MCP server keys.

### proxy/pricing.js (71 LOC)
- `priceFor(model)` — longest-prefix match against `DEFAULTS` table.
- `calcCost(model, usage)` — computes USD cost from token counts.
- Override via `BURNWATCH_PRICING` env var (JSON) or `proxy/pricing.json`.

### src/hooks/useUsageStore.js (133 LOC)
- Polls `/api/usage` every `interval` seconds (default 3s).
- Keeps last 120 snapshots; derives `burnRate`, `delta`, `sparklineData`, `modelSwitchPoints`.
- Persists `darkMode` to `localStorage`.

### src/hooks/useHistoryStore.js (60 LOC)
- Fetches `/api/history` with `resolution` + `since` derived from `barCount * bucketMs`.
- Range configs: `1m/2s`, `5m/10s`, `15m/30s`, `1h/2m`, `6h/12m`, `24h/48m`.

### src/components/BurnGauge.jsx (440 LOC)
- SVG rolling bar chart; bars color-coded by model family.
- `ResizeObserver` for adaptive bar count.
- Range picker (1m|5m|15m|1h|6h|24h); threshold zones (green/amber/red).
- Tooltip shows model, tokens, cost per bucket window.

### src/lib/calcBurnRate.js (31 LOC)
- 60s sliding window; zeroes immediately on duplicate `totalTokens` (idle detection).

---

## Model Colors

| Family | Color | CSS var |
|--------|-------|---------|
| haiku | cyan | `--model-haiku` |
| sonnet | violet | `--model-sonnet` |
| opus | amber/gold | `--model-opus` |
| fable | pink | `--model-fable` |

---

## Pricing Table (proxy/pricing.js)

| Model prefix | Input $/M | Output $/M |
|---|---|---|
| claude-fable-5 / claude-mythos-5 | $10 | $50 |
| claude-opus-4-8/7/6/5 | $5 | $25 |
| claude-opus-4 (4.0/4.1) | $15 | $75 |
| claude-sonnet-4-x | $3 | $15 |
| claude-haiku-4-x | $1 | $5 |
| claude-haiku-3-x | $0.80 | $4 |

---

## npm Scripts

| Script | Command |
|--------|---------|
| `dev` | `concurrently node proxy/server.js vite` |
| `kill` | Kill processes on ports 3777 + 5777 |
| `restart` | `kill` then `dev` |
| `build` | `vite build` → `dist/` |
| `preview` | Serve `dist/` locally |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` + `cors` | Proxy server |
| `react` 19 + `react-dom` | UI |
| `recharts` 3 | Sparkline (Sparkline.jsx only) |
| `react-hot-toast` | Threshold alert toasts |
| `vite` 6 + `@vitejs/plugin-react` | Build / HMR |
| `concurrently` | Run proxy + vite together |

---

## Configuration

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite config; proxy `/api` → `localhost:3777` |
| `.gitignore` | Ignores `proxy/pricing.json`, `.data/`, `dist/`, `pnpm-lock.yaml` |
| `proxy/pricing.json.example` | Template for enterprise pricing overrides |
| `.data/labels.json` | Runtime: session label map |

---

## Branch Notes

- `main` — stable; has BurnGauge history chart, ccusage-based
- `jsonl-reader` (current) — rewrites data layer to read JSONL directly; adds per-model bar coloring, configurable pricing
