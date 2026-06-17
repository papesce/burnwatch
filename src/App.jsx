import { useEffect, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { useUsageStore } from './hooks/useUsageStore.js'
import Banner from './components/Banner.jsx'
import BurnRateHero from './components/BurnRateHero.jsx'
import SessionTotals from './components/SessionTotals.jsx'
import BurnGauge from './components/BurnGauge.jsx'

export default function App() {
  const store = useUsageStore()
  const {
    latest, delta, burnRate, isIdle, isOverThreshold, error,
    interval, paused, threshold, darkMode,
    setIntervalSec, togglePause, setThreshold, toggleDarkMode,
  } = store

  const wasOverRef = useRef(false)
  useEffect(() => {
    if (isOverThreshold && !wasOverRef.current) {
      toast.error(`Burn rate exceeded $${threshold.toFixed(2)}/min`, {
        duration: 5000,
        style: {
          background: 'rgba(20,10,15,0.95)',
          color: '#ff4d6d',
          border: '1px solid #ff4d6d',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.8rem',
        },
      })
    }
    wasOverRef.current = isOverThreshold
  }, [isOverThreshold, threshold])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.code === 'Space') { e.preventDefault(); togglePause() }
      if (e.key === '+' || e.key === '=') setIntervalSec(i => Math.min(30, i + 1))
      if (e.key === '-') setIntervalSec(i => Math.max(1, i - 1))
      if (e.key === 'd' || e.key === 'D') toggleDarkMode()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePause, setIntervalSec, toggleDarkMode])

  return (
    <div className="app-shell">
      <Toaster position="top-right" />
      <Banner
        darkMode={darkMode}
        onThemeToggle={toggleDarkMode}
        paused={paused}
        onPause={togglePause}
        interval={interval}
        onIntervalChange={setIntervalSec}
      />
      <div className="app-grid">
        <div className={`glass-card area-burn${isOverThreshold ? ' glass-card--alert' : ''}`}>
          <BurnRateHero
            burnRate={burnRate}
            isIdle={isIdle}
            isOverThreshold={isOverThreshold}
            threshold={threshold}
            onThresholdChange={setThreshold}
            error={error}
            delta={delta}
            interval={interval}
          />
        </div>

        <div className="glass-card area-totals">
          <SessionTotals latest={latest} />
        </div>

        <div className="area-history">
          <BurnGauge />
        </div>
      </div>
    </div>
  )
}
