import { useState, useEffect, useCallback } from 'react'

const POLL_MS = 30_000
const ZERO = { projects: [], labels: [] }

export function useProjectTotals() {
  const [data, setData] = useState(ZERO)

  const poll = useCallback(async () => {
    try {
      const res  = await fetch('/api/projects')
      const json = await res.json()
      if (json.ok) setData({ projects: json.projects, labels: json.labels })
    } catch (_) {}
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [poll])

  return data
}
