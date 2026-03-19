'use client'
import { useState, useEffect } from 'react'

interface Countdown {
  id: string; title: string; date: string; daysRemaining: number
  type: string; memberName: string; color: string
}

const TYPE_ICONS: Record<string, string> = {
  birthday: '🎂', vacation: '✈️', countdown: '⏳',
}

export default function CountdownCards() {
  const [items, setItems] = useState<Countdown[]>([])

  useEffect(() => {
    const load = () => {
      fetch('/api/events/countdowns').then(r => r.json()).then(data => {
        if (Array.isArray(data)) setItems(data)
      }).catch(() => {})
    }
    load()
    const iv = setInterval(load, 5 * 60_000)
    const handler = () => load()
    window.addEventListener('sse-update', handler)
    return () => { clearInterval(iv); window.removeEventListener('sse-update', handler) }
  }, [])

  if (items.length === 0) return null

  // Format "2026-03-20" as "Mar 20"
  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(y, m - 1, day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 16px', flexShrink: 0 }}>
      {items.map(item => {
        const icon = TYPE_ICONS[item.type] || TYPE_ICONS[
          item.title.toLowerCase().includes('birthday') ? 'birthday' :
          item.title.toLowerCase().includes('vacation') ? 'vacation' : 'countdown'
        ] || '📌'
        return (
          <div key={item.id} style={{
            flexShrink: 0, minWidth: 130, padding: '8px 12px',
            borderRadius: 12, background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${item.color}30`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.title}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: item.color, lineHeight: 1.2 }}>
                {item.daysRemaining === 0 ? 'Today!' : item.daysRemaining === 1 ? 'Tomorrow' : `${item.daysRemaining}d`}
              </div>
              <div style={{ fontSize: 9, color: '#6a6d8a' }}>
                {formatDate(item.date)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
