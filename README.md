# BurnWatch

![BurnWatch](burnwatch.png)

**Real-time Claude token burn rate dashboard.** Know exactly how fast you're spending — before the bill does.

BurnWatch polls `ccusage` and surfaces your active session's burn rate, cost per hour, token velocity, and a live sparkline — all in a clean dark-mode UI that stays out of your way.

---

## Features

- **Live burn rate** — tokens/min and $/hr updated every few seconds
- **Sparkline chart** — visualise token velocity over time at a glance
- **Session totals** — input, output, cache creation, and cache read tokens broken down
- **Cost tracking** — running USD cost for the active session
- **Threshold alerts** — toast notifications when burn rate spikes
- **Keyboard-first** — pause, adjust polling speed, and toggle dark mode without touching the mouse

---

## Prerequisites

- Node.js 18+
- [`ccusage`](https://github.com/ryoppippi/ccusage) installed globally:

```bash
npm i -g ccusage
```

---

## Install

```bash
git clone https://github.com/your-username/burnwatch.git
cd burnwatch
npm install
```

---

## Quick Start (burn.sh)

A convenience script is included for common tasks:

```bash
./burn.sh install    # npm install + ccusage
./burn.sh open       # start the dev server
./burn.sh kill       # stop processes on ports 3777/5777
./burn.sh restart    # kill then restart
./burn.sh build      # production build
./burn.sh setup      # symlink to /usr/local/bin/burn (run once)
./burn.sh uninstall  # remove symlink and node_modules
```

After running `./burn.sh setup`, you can use `burn install`, `burn open`, etc. from any terminal.

---

## Run

```bash
npm run dev
```

Opens at **http://localhost:5777**. The Express proxy starts on port **3777** automatically via `concurrently`.

---

## Build

```bash
npm run build    # output in dist/
npm run preview  # serve the build locally
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Pause / resume polling |
| `+` / `-` | Increase / decrease poll interval |
| `D` | Toggle dark / light mode |

---

## How It Works

BurnWatch runs a lightweight Express proxy that shells out to `ccusage blocks --active --json` and normalises the response. The React frontend polls the proxy and renders everything live — no database, no auth, no config.

Expected shape from `ccusage`:

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

---

## Stack

- **React 19** + **Vite 6** — frontend
- **Recharts** — sparkline visualisation
- **Express** — local proxy for `ccusage`
- **react-hot-toast** — burn rate alerts
