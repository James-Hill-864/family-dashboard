'use client'
import { useState, useEffect } from 'react'

interface BriefingData {
  weather?: { temp: number; condition: string }
  events: Array<{ title: string; time: string; member: string }>
  meals: { breakfast?: string; lunch?: string; dinner?: string }
  chores: Array<{ title: string; assignee: string }>
}

export default function MorningBriefing({ onDismiss }: { onDismiss: () => void }) {
  const [data, setData] = useState<BriefingData | null>(null)

  useEffect(() => {
    const loadBriefing = async () => {
      const now = new Date()
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      const end = new Date(now); end.setHours(23, 59, 59, 999)

      const [weatherRes, eventsRes, mealsRes, todosRes] = await Promise.all([
        fetch('/api/weather').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/events?start=${start.toISOString()}&end=${end.toISOString()}`).then(r => r.json()).catch(() => []),
        fetch(`/api/meals?weekStart=${getSunday().toISOString()}`).then(r => r.json()).catch(() => []),
        fetch('/api/todos').then(r => r.json()).catch(() => []),
      ])

      const dayOfWeek = now.getDay()
      const todayMeals = Array.isArray(mealsRes) ? mealsRes.filter((m: { day: number }) => m.day === dayOfWeek) : []

      setData({
        weather: weatherRes?.current ? { temp: Math.round(weatherRes.current.temperature), condition: weatherRes.current.weatherCode?.toString() || 'clear' } : undefined,
        events: Array.isArray(eventsRes) ? eventsRes.slice(0, 5).map((e: { title: string; startTime: string; allDay?: boolean; member?: { name: string } }) => ({
          title: e.title,
          time: e.allDay ? 'All day' : new Date(e.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          member: e.member?.name || '',
        })) : [],
        meals: {
          breakfast: todayMeals.find((m: { mealType: string }) => m.mealType === 'breakfast')?.name,
          lunch: todayMeals.find((m: { mealType: string }) => m.mealType === 'lunch')?.name,
          dinner: todayMeals.find((m: { mealType: string }) => m.mealType === 'dinner')?.name,
        },
        chores: Array.isArray(todosRes) ? todosRes
          .filter((t: { category: string; done: boolean }) => t.category === 'chore' && !t.done)
          .slice(0, 4)
          .map((t: { title: string; assignee?: { name: string } }) => ({ title: t.title, assignee: t.assignee?.name || '' })) : [],
      })
    }
    loadBriefing()
  }, [])

  if (!data) return null

  const greeting = getGreeting()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 45,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.5s ease-in-out',
    }} onClick={onDismiss}>
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
      <div style={{
        width: '90%', maxWidth: 600, background: '#0f1220',
        borderRadius: 24, border: '1px solid #1e293b',
        padding: 32, overflow: 'auto', maxHeight: '80vh',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{greeting}</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Weather */}
        {data.weather && (
          <div style={{ textAlign: 'center', marginBottom: 20, padding: '12px 0', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>{data.weather.temp}°F</span>
          </div>
        )}

        {/* Today's Events */}
        {data.events.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Today&apos;s Schedule</div>
            {data.events.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #1a1d2e' }}>
                <span style={{ fontSize: 12, color: '#6b7280', width: 60, flexShrink: 0 }}>{e.time}</span>
                <span style={{ fontSize: 13, color: '#e2e8f0', flex: 1 }}>{e.title}</span>
                <span style={{ fontSize: 11, color: '#4a4d6a' }}>{e.member}</span>
              </div>
            ))}
          </div>
        )}

        {/* Meals */}
        {(data.meals.breakfast || data.meals.lunch || data.meals.dinner) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Meals</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {data.meals.breakfast && <div style={{ flex: 1, background: '#1a1d2e', borderRadius: 8, padding: '8px 10px' }}><div style={{ fontSize: 9, color: '#6b7280' }}>Breakfast</div><div style={{ fontSize: 12, color: '#fff', marginTop: 2 }}>{data.meals.breakfast}</div></div>}
              {data.meals.lunch && <div style={{ flex: 1, background: '#1a1d2e', borderRadius: 8, padding: '8px 10px' }}><div style={{ fontSize: 9, color: '#6b7280' }}>Lunch</div><div style={{ fontSize: 12, color: '#fff', marginTop: 2 }}>{data.meals.lunch}</div></div>}
              {data.meals.dinner && <div style={{ flex: 1, background: '#1a1d2e', borderRadius: 8, padding: '8px 10px' }}><div style={{ fontSize: 9, color: '#6b7280' }}>Dinner</div><div style={{ fontSize: 12, color: '#fff', marginTop: 2 }}>{data.meals.dinner}</div></div>}
            </div>
          </div>
        )}

        {/* Chores */}
        {data.chores.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Chores Due</div>
            {data.chores.map((c, i) => (
              <div key={i} style={{ fontSize: 12, color: '#e2e8f0', padding: '4px 0' }}>
                {c.title} {c.assignee && <span style={{ color: '#6b7280' }}>— {c.assignee}</span>}
              </div>
            ))}
          </div>
        )}

        <button onClick={onDismiss} style={{
          width: '100%', height: 48, borderRadius: 12, background: '#3b82f6',
          color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 8,
        }}>
          Let&apos;s Go!
        </button>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning!'
  if (hour < 17) return 'Good Afternoon!'
  return 'Good Evening!'
}

function getSunday(): Date {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}
