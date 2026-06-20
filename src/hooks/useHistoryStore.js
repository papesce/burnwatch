import { useState, useEffect, useCallback } from 'react'

const RANGES = ['1m', '5m', '15m', '1h', '6h', '24h']

function parseBucketMs(resolution) {
  const n = parseInt(resolution)
  if (resolution.endsWith('s')) return n * 1000
  if (resolution.endsWith('m')) return n * 60 * 1000
  return 10_000
}

const RANGE_CONFIG = {
  '1m':  { sinceMs: 60_000,        resolution: '2s',  pollMs: 5_000  },
  '5m':  { sinceMs: 300_000,       resolution: '10s', pollMs: 5_000  },
  '15m': { sinceMs: 900_000,       resolution: '30s', pollMs: 15_000 },
  '1h':  { sinceMs: 3_600_000,     resolution: '2m',  pollMs: 30_000 },
  '6h':  { sinceMs: 21_600_000,    resolution: '12m', pollMs: 30_000 },
  '24h': { sinceMs: 86_400_000,    resolution: '48m', pollMs: 60_000 },
}

export { RANGES }

export function useHistoryStore(frozen, controlledRange) {
  const [rows,     setRows]     = useState([])
  const [internalRange, setInternalRange] = useState('5m')
  const [barCount, setBarCount] = useState(60)
  const range = controlledRange ?? internalRange
  const setRange = controlledRange == null ? setInternalRange : () => {}
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const config = RANGE_CONFIG[range] ?? RANGE_CONFIG['5m']

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const bucketMs = parseBucketMs(config.resolution)
      const sinceMs  = Date.now() - barCount * bucketMs
      const res = await fetch(`/api/history?resolution=${config.resolution}&since=${sinceMs}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'history fetch failed')
      setRows(data.rows)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [config.resolution, barCount])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  useEffect(() => {
    if (frozen) return
    const id = setInterval(fetchHistory, config.pollMs)
    return () => clearInterval(id)
  }, [fetchHistory, config.pollMs, frozen])

  return {
    rows, range, loading, error,
    setRange, setBarCount,
    ranges: RANGES,
    refetch: fetchHistory,
  }
}
