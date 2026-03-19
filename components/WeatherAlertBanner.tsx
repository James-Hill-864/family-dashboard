'use client'
import { useState, useEffect } from 'react'

interface Alert { id: string; title: string; description: string; severity: string }

export default function WeatherAlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const load = async () => {
    try {
      const res = await fetch('/api/weather/alerts')
      if (res.ok) setAlerts(await res.json())
    } catch {}
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 15 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="fixed left-0 right-0 z-40" style={{ top: '68px' }}>
      {visible.map(alert => (
        <div key={alert.id} className="flex items-start gap-3 px-4 py-2"
          style={{ background: alert.severity === 'Extreme' || alert.severity === 'Severe' ? '#ef4444' : '#f59e0b', minHeight: '48px' }}>
          <span style={{ fontSize: '18px', flexShrink: 0, paddingTop: '2px' }}>⚠️</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white" style={{ fontSize: '13px' }}>{alert.title}</div>
            <div className="text-white/80 truncate" style={{ fontSize: '11px' }}>{alert.description.slice(0, 150)}</div>
          </div>
          <button onClick={() => setDismissed(d => { const next = new Set(d); next.add(alert.id); return next })}
            className="flex-shrink-0 text-white/80 font-bold"
            style={{ fontSize: '18px', background: 'transparent', padding: '0 4px' }}>×</button>
        </div>
      ))}
    </div>
  )
}
