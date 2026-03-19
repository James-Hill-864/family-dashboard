'use client'
import { useState, useEffect } from 'react'

interface Countdown { title: string; daysRemaining: number; date: string }

export default function BirthdayBanner() {
  const [birthday, setBirthday] = useState<Countdown | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/events/countdowns').then(r => r.json()).then((data: Countdown[]) => {
      if (!Array.isArray(data)) return
      const upcoming = data.find(e =>
        (e.title.toLowerCase().includes('birthday') || e.title.toLowerCase().includes('bday')) &&
        e.daysRemaining >= 0 && e.daysRemaining <= 7
      )
      if (upcoming) setBirthday(upcoming)
    }).catch(() => {})
  }, [])

  if (!birthday || dismissed) return null

  const isToday = birthday.daysRemaining === 0
  const label = isToday
    ? `Today is ${birthday.title}!`
    : birthday.daysRemaining === 1
    ? `${birthday.title} is tomorrow!`
    : `${birthday.title} in ${birthday.daysRemaining} days!`

  return (
    <div style={{
      position: 'fixed', bottom: 40, left: 0, right: 0, zIndex: 35,
      height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: isToday
        ? 'linear-gradient(90deg, #ec4899, #f59e0b, #ec4899)'
        : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
      color: '#fff', fontSize: 13, fontWeight: 700,
      animation: isToday ? 'birthdayPulse 2s ease-in-out infinite' : 'none',
    }}>
      <style>{`@keyframes birthdayPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.85 } }`}</style>
      <span style={{ fontSize: 16 }}>🎂</span>
      <span>{label}</span>
      <span style={{ fontSize: 16 }}>🎉</span>
      <button onClick={() => setDismissed(true)}
        style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 16 }}>
        ×
      </button>
    </div>
  )
}
