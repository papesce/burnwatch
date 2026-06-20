import { useState, useEffect, useCallback } from 'react'

const POLL_MS = 15_000
const ZERO = { avg5m: 0, avg15m: 0, avg1h: 0, avg6h: 0, avg24h: 0 }

export function useEstimates() {
  const [data, setData] = useState(ZERO)

  const poll = useCallback(async () => {
    try {
      const res  = await fetch('/api/estimates')
      const json = await res.json()
      if (json.ok) setData({ avg5m: json.avg5m, avg15m: json.avg15m, avg1h: json.avg1h, avg6h: json.avg6h, avg24h: json.avg24h })
    } catch (_) {}
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [poll])

  return data
}
