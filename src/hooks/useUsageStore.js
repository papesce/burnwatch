import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { calcBurnRate } from '../lib/calcBurnRate.js'

const MAX_SNAPSHOTS = 120

function buildSnapshot(block, ts, latencyMs) {
  return {
    ts,
    latencyMs,
    sessionId:            block.id,
    costUSD:              block.costUSD,
    totalTokens:          block.totalTokens,
    inputTokens:          block.inputTokens,
    outputTokens:         block.outputTokens,
    cacheCreationTokens:  block.cacheCreationTokens,
    cacheReadTokens:      block.cacheReadTokens,
    models:               block.models,
    startTime:            block.startTime ?? null,
    burnRateTokensPerMin: block.burnRate.tokensPerMinuteForIndicator,
    burnRateCostPerHour:  block.burnRate.costPerHour,
  }
}

export function useUsageStore() {
  const [snapshots, setSnapshots]   = useState([])
  const [interval,  setIntervalSec] = useState(3)
  const [paused,    setPaused]      = useState(false)
  const [threshold, setThreshold]   = useState(0.10)
  const [error,     setError]       = useState(null)
  const [lastPollTs, setLastPollTs] = useState(null)
  const [latencyMs,  setLatencyMs]  = useState(null)
  const [darkMode,  setDarkMode]    = useState(
    () => JSON.parse(localStorage.getItem('tokenator-dark') ?? 'true')
  )

  // Persist dark mode
  useEffect(() => {
    localStorage.setItem('tokenator-dark', JSON.stringify(darkMode))
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const poll = useCallback(async () => {
    const t0 = Date.now()
    try {
      const res = await fetch('/api/usage')
      const data = await res.json()
      const ms = Date.now() - t0
      setLatencyMs(ms)
      setLastPollTs(Date.now())

      if (!data.ok) {
        setError(data.error ?? 'failed to read usage data')
        return
      }
      if (!data.block) {
        setError(null)
        return
      }
      setError(null)
      const snap = buildSnapshot(data.block, data.ts, ms)
      setSnapshots(prev => {
        const next = [...prev, snap]
        return next.length > MAX_SNAPSHOTS ? next.slice(-MAX_SNAPSHOTS) : next
      })
    } catch (e) {
      setLatencyMs(Date.now() - t0)
      setLastPollTs(Date.now())
      setError('Proxy unreachable — is it running?')
    }
  }, [])

  // Main polling effect
  useEffect(() => {
    if (paused) return
    poll() // fire immediately
    const id = setInterval(poll, interval * 1000)
    return () => clearInterval(id)
  }, [paused, interval, poll])

  // ── Derived values ──────────────────────────────────────────
  const latest = useMemo(() => snapshots[snapshots.length - 1] ?? null, [snapshots])

  const delta = useMemo(() => {
    if (snapshots.length < 2) return null
    const curr = snapshots[snapshots.length - 1]
    const prev = snapshots[snapshots.length - 2]
    return {
      tokens: Math.max(0, curr.totalTokens - prev.totalTokens),
      cost:   Math.max(0, curr.costUSD - prev.costUSD),
      ts:     curr.ts,
    }
  }, [snapshots])

  const burnRate = useMemo(() => calcBurnRate(snapshots), [snapshots])

  const sparklineData = useMemo(() =>
    snapshots.slice(-60).map(s => ({
      ts:          s.ts,
      tokensPerSec: s.burnRateTokensPerMin / 60,
      costPerMin:   s.burnRateCostPerHour / 60,
    }))
  , [snapshots])

  const modelSwitchPoints = useMemo(() => {
    const window60 = snapshots.slice(-60)
    return window60.reduce((acc, snap, i) => {
      if (i === 0) return acc
      const prevSig = window60[i - 1].models.slice().sort().join('|')
      const currSig = snap.models.slice().sort().join('|')
      if (prevSig !== currSig) {
        const label = snap.models
          .map(m => m.replace('claude-', '').split('-').slice(0, 2).join('-'))
          .join(', ')
        acc.push({ index: i, ts: snap.ts, models: snap.models, label })
      }
      return acc
    }, [])
  }, [snapshots])

  const isIdle = burnRate.tokensPerSec < 0.1
  const isOverThreshold = burnRate.costPerMin > threshold

  return {
    // raw state
    snapshots, interval, paused, threshold, error, lastPollTs, latencyMs, darkMode,
    // derived
    latest, delta, burnRate, sparklineData, modelSwitchPoints, isIdle, isOverThreshold,
    // actions
    setIntervalSec,
    togglePause:    () => setPaused(p => !p),
    setThreshold,
    toggleDarkMode: () => setDarkMode(d => !d),
  }
}
