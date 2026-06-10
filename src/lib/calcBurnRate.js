export function calcBurnRate(snapshots) {
  const now = Date.now()
  const windowMs = 60_000

  // If the last two snapshots have identical totals, activity has stopped — go idle immediately.
  if (snapshots.length >= 2) {
    const last = snapshots[snapshots.length - 1]
    const prev = snapshots[snapshots.length - 2]
    if (last.totalTokens === prev.totalTokens) {
      return { tokensPerSec: 0, costPerMin: 0, costPerHour: 0 }
    }
  }

  const window = snapshots.filter(s => now - s.ts <= windowMs)
  if (window.length < 2) return { tokensPerSec: 0, costPerMin: 0, costPerHour: 0 }

  const first = window[0]
  const last  = window[window.length - 1]
  const elapsedSec = (last.ts - first.ts) / 1000

  if (elapsedSec <= 0) return { tokensPerSec: 0, costPerMin: 0, costPerHour: 0 }

  const tokensPerSec = (last.totalTokens - first.totalTokens) / elapsedSec
  const costPerSec   = (last.costUSD     - first.costUSD)     / elapsedSec

  return {
    tokensPerSec: Math.max(0, tokensPerSec),
    costPerMin:   Math.max(0, costPerSec * 60),
    costPerHour:  Math.max(0, costPerSec * 3600),
  }
}
