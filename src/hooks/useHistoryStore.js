import { useState, useEffect, useCallback } from 'react'

const RESOLUTIONS = ['second', 'minute', 'hour']
const SINCE_PRESETS = {
  '15m': 15 * 60 * 1000,
  '1h':  60 * 60 * 1000,
  '6h':  6  * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
}

export function useHistoryStore() {
  const [rows,       setRows]       = useState([])
  const [plugins,    setPlugins]    = useState([])
  const [resolution, setResolution] = useState('minute')
  const [sincePreset, setSincePreset] = useState('1h')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  const sinceMs = Date.now() - (SINCE_PRESETS[sincePreset] ?? SINCE_PRESETS['1h'])

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const since = Date.now() - (SINCE_PRESETS[sincePreset] ?? SINCE_PRESETS['1h'])
      const res  = await fetch(`/api/history?resolution=${resolution}&since=${since}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'history fetch failed')
      setRows(data.rows)
      setPlugins(data.plugins ?? [])
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [resolution, sincePreset])

  // Fetch on mount and whenever resolution/range changes
  useEffect(() => { fetch_() }, [fetch_])

  // Background re-fetch every 30s
  useEffect(() => {
    const id = setInterval(fetch_, 30_000)
    return () => clearInterval(id)
  }, [fetch_])

  return {
    rows, plugins, resolution, sincePreset, loading, error,
    setResolution, setSincePreset,
    resolutions: RESOLUTIONS,
    sincePresets: Object.keys(SINCE_PRESETS),
    refetch: fetch_,
  }
}
