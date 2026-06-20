import { useState, useEffect, useCallback } from 'react'

const POLL_MS = 60_000
const EMPTY   = { tokens: 0, costUSD: 0 }

export function usePeriodicTotals() {
  const [totals, setTotals] = useState({ today: EMPTY, week: EMPTY, month: EMPTY })
  const [error, setError]   = useState(null)

  const poll = useCallback(async () => {
    try {
      const res  = await fetch('/api/totals')
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'totals fetch failed')
      setTotals({ today: data.today, week: data.week, month: data.month })
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [poll])

  return { ...totals, error }
}
