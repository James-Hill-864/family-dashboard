'use client'
import { useState, useEffect } from 'react'
import WeatherWidget from './WeatherWidget'
import CountdownCards from './CountdownCards'
import TodoList from './TodoList'
import FamilyNotes from './FamilyNotes'

type UtilTab = 'todo' | 'chores' | 'notes'

interface CalEvent { id: string; title: string; startTime: string; endTime: string; memberId: string; allDay?: boolean; type?: string; member?: { name: string; color: string } }
interface Member { id: string; name: string; color: string; emoji: string }
interface MealPlan { id: string; day: number; mealType: string; name: string }
interface Props { filterMemberIds?: string[] }

export default function TodayTab({ filterMemberIds }: Props) {
  const [utilTab, setUtilTab] = useState<UtilTab>('todo')
  const [events, setEvents] = useState<CalEvent[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [meals, setMeals] = useState<MealPlan[]>([])
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set())

  const loadEvents = () => {
    const now = new Date()
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end = new Date(now); end.setHours(23, 59, 59, 999)
    const upcoming3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Get week start for meals
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    Promise.all([
      fetch(`/api/events?start=${start.toISOString()}&end=${end.toISOString()}`).then(r => r.json()),
      fetch(`/api/events?start=${end.toISOString()}&end=${upcoming3.toISOString()}`).then(r => r.json()),
      fetch('/api/members').then(r => r.json()),
      fetch(`/api/meals?weekStart=${weekStart.toISOString()}`).then(r => r.json()),
    ]).then(([evts, upcoming, mems, mls]) => {
      setEvents(Array.isArray(evts) ? evts : [])
      setUpcomingEvents(Array.isArray(upcoming) ? upcoming.slice(0, 5) : [])
      setMembers(Array.isArray(mems) ? mems : [])
      setMeals(Array.isArray(mls) ? mls : [])
    }).catch(() => {})
  }

  useEffect(() => {
    loadEvents()
    const iv = setInterval(loadEvents, 60000)
    const handler = () => loadEvents()
    window.addEventListener('sse-update', handler)
    return () => { clearInterval(iv); window.removeEventListener('sse-update', handler) }
  }, [])

  const visibleEvents = filterMemberIds?.length
    ? events.filter(e => filterMemberIds.includes(e.memberId))
    : events

  const todayDow = new Date().getDay()
  const todayMeals = meals.filter(m => m.day === todayDow)
  const todayBreakfast = todayMeals.find(m => m.mealType === 'breakfast')?.name
  const todayLunch = todayMeals.find(m => m.mealType === 'lunch')?.name
  const todayDinner = todayMeals.find(m => m.mealType === 'dinner')?.name
  const hasMeals = todayBreakfast || todayLunch || todayDinner

  const UTIL_TABS: { id: UtilTab; label: string; icon: string }[] = [
    { id: 'todo', label: 'To-Do', icon: '✓' },
    { id: 'chores', label: 'Chores', icon: '🧹' },
    { id: 'notes', label: 'Notes', icon: '📝' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Weather */}
      <div style={{ flexShrink: 0, height: 155, overflow: 'hidden', position: 'relative', borderBottom: '1px solid #1a1d2e' }}>
        <WeatherWidget />
      </div>

      {/* Countdown cards */}
      <CountdownCards />

      {/* Today's Agenda */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', flexShrink: 0, borderBottom: '1px solid #1a1d2e' }}>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today</span>
          {visibleEvents.length > 0 && (
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {visibleEvents.length}
            </span>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {visibleEvents.length === 0 ? (
            <div style={{ padding: '12px 14px' }}>
              {/* Today's meals when no events */}
              {hasMeals && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#4a4d6a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Today&apos;s Meals</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {todayBreakfast && (
                      <div style={{ flex: 1, padding: '6px 8px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <div style={{ fontSize: 9, color: '#92400e' }}>Breakfast</div>
                        <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 500 }}>{todayBreakfast}</div>
                      </div>
                    )}
                    {todayLunch && (
                      <div style={{ flex: 1, padding: '6px 8px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                        <div style={{ fontSize: 9, color: '#1e40af' }}>Lunch</div>
                        <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 500 }}>{todayLunch}</div>
                      </div>
                    )}
                    {todayDinner && (
                      <div style={{ flex: 1, padding: '6px 8px', borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                        <div style={{ fontSize: 9, color: '#5b21b6' }}>Dinner</div>
                        <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 500 }}>{todayDinner}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Coming up preview */}
              {upcomingEvents.length > 0 ? (
                <div>
                  <div style={{ fontSize: 10, color: '#4a4d6a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Coming Up</div>
                  {upcomingEvents.map(e => {
                    const d = new Date(e.startTime)
                    const member = members.find(m => m.id === e.memberId)
                    return (
                      <div key={e.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <div style={{ width: 3, height: 24, borderRadius: 2, background: member?.color || '#3b82f6', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>
                            {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {!e.allDay && ` · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : !hasMeals && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', gap: 4 }}>
                  <div style={{ fontSize: 13, color: '#4a4d6a' }}>No events today</div>
                  <div style={{ fontSize: 11, color: '#3a3d58' }}>Tap + on the calendar to add one</div>
                </div>
              )}
            </div>
          ) : visibleEvents.map((e: CalEvent) => {
            const member = members.find((m: Member) => m.id === e.memberId)
            const timeStr = e.allDay ? 'All day' : new Date(e.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            const hasAvatarError = avatarErrors.has(e.memberId)
            return (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', minHeight: 52,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                borderLeft: `3px solid ${member?.color || '#3b82f6'}`,
                background: 'rgba(255,255,255,0.015)',
              }}>
                <span style={{ fontSize: 11, color: '#6b7280', width: 44, flexShrink: 0, fontWeight: 500 }}>{timeStr}</span>
                <span style={{ fontSize: 13, color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{e.title}</span>
                {member && (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: member.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden',
                    boxShadow: `0 0 0 2px ${member.color}30`,
                  }}>
                    {!hasAvatarError ? (
                      <img src={`/api/avatars/${member.id}`} alt={member.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setAvatarErrors(prev => { const n = new Set(prev); n.add(e.memberId); return n })} />
                    ) : member.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Utility sub-tabs */}
      <div style={{ height: 210, display: 'flex', flexDirection: 'column', borderTop: '1px solid #1a1d2e', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexShrink: 0, height: 34, borderBottom: '1px solid #1a1d2e', background: 'rgba(255,255,255,0.01)' }}>
          {UTIL_TABS.map(t => (
            <button key={t.id} onClick={() => setUtilTab(t.id)} style={{
              flex: 1, height: 34, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none',
              color: utilTab === t.id ? '#8b5cf6' : '#4a4d6a',
              borderBottom: utilTab === t.id ? '2px solid #8b5cf6' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'color 0.15s',
            }}>
              <span style={{ fontSize: 12 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {utilTab === 'todo' && <TodoList category="todo" title="To-Do" />}
          {utilTab === 'chores' && <TodoList category="chore" title="Chores" />}
          {utilTab === 'notes' && <FamilyNotes />}
        </div>
      </div>
    </div>
  )
}
