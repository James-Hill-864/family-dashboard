'use client'
import { useState, useEffect } from 'react'
import WeatherWidget from './WeatherWidget'
import CountdownCards from './CountdownCards'
import TodoList from './TodoList'
import GroceryList from './GroceryList'
import FamilyNotes from './FamilyNotes'

type UtilTab = 'todo' | 'chores' | 'grocery' | 'notes'

interface CalEvent { id: string; title: string; startTime: string; endTime: string; memberId: string; allDay?: boolean }
interface Member { id: string; name: string; color: string; emoji: string }
interface Props { filterMemberIds?: string[] }

export default function TodayTab({ filterMemberIds }: Props) {
  const [utilTab, setUtilTab] = useState<UtilTab>('todo')
  const [events, setEvents] = useState<CalEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set())

  const loadEvents = () => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end = new Date(); end.setHours(23, 59, 59, 999)
    Promise.all([
      fetch(`/api/events?start=${start.toISOString()}&end=${end.toISOString()}`).then(r => r.json()),
      fetch('/api/members').then(r => r.json()),
    ]).then(([evts, mems]) => {
      setEvents(Array.isArray(evts) ? evts : [])
      setMembers(Array.isArray(mems) ? mems : [])
    }).catch(() => {})
  }

  useEffect(() => {
    loadEvents()
    const iv = setInterval(loadEvents, 60000)
    // SSE updates
    const handler = () => loadEvents()
    window.addEventListener('sse-update', handler)
    return () => { clearInterval(iv); window.removeEventListener('sse-update', handler) }
  }, [])

  const visibleEvents = filterMemberIds?.length
    ? events.filter(e => filterMemberIds.includes(e.memberId))
    : events

  const UTIL_TABS: { id: UtilTab; label: string }[] = [
    { id: 'todo', label: 'To-Do' },
    { id: 'chores', label: 'Chores' },
    { id: 'grocery', label: 'Grocery' },
    { id: 'notes', label: 'Notes' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Weather — fixed 155px */}
      <div style={{ flexShrink: 0, height: 155, overflow: 'hidden', position: 'relative', borderBottom: '1px solid #1a1d2e' }}>
        <WeatherWidget />
      </div>

      {/* Countdown cards */}
      <CountdownCards />

      {/* Today's Agenda — flex:1, fills remaining space */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Agenda header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', flexShrink: 0, borderBottom: '1px solid #1a1d2e' }}>
          <span style={{ fontSize: 9, color: '#4a4d6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today&apos;s Agenda</span>
          {visibleEvents.length > 0 && (
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {visibleEvents.length}
            </span>
          )}
        </div>
        {/* Event list */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {visibleEvents.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#4a4d6a' }}>
              Nothing scheduled today 🎉
            </div>
          ) : visibleEvents.map((e: CalEvent) => {
            const member = members.find((m: Member) => m.id === e.memberId)
            const timeStr = e.allDay ? 'All day' : new Date(e.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            const hasAvatarError = avatarErrors.has(e.memberId)
            return (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 12px', minHeight: 48,
                borderBottom: '1px solid #1a1d2e',
                borderLeft: `4px solid ${member?.color || '#3b82f6'}`,
              }}>
                <span style={{ fontSize: 9, color: '#4a4d6a', width: 38, flexShrink: 0 }}>{timeStr}</span>
                <span style={{ fontSize: 11, color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{e.title}</span>
                {member && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: member.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden',
                  }}>
                    {!hasAvatarError ? (
                      <img
                        src={`/api/avatars/${member.id}`}
                        alt={member.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setAvatarErrors(prev => { const n = new Set(prev); n.add(e.memberId); return n })}
                      />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Utility sub-tabs — fixed 200px */}
      <div style={{ height: 200, display: 'flex', flexDirection: 'column', borderTop: '1px solid #1a1d2e', overflow: 'hidden', flexShrink: 0 }}>
        {/* Sub-tab bar */}
        <div style={{ display: 'flex', flexShrink: 0, height: 28, borderBottom: '1px solid #1a1d2e' }}>
          {UTIL_TABS.map(t => (
            <button key={t.id} onClick={() => setUtilTab(t.id)} style={{
              height: 28, padding: '0 12px', fontSize: 9, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none',
              color: utilTab === t.id ? '#8b5cf6' : '#4a4d6a',
              borderBottom: utilTab === t.id ? '2px solid #8b5cf6' : '2px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {utilTab === 'todo' && <TodoList category="todo" title="To-Do" />}
          {utilTab === 'chores' && <TodoList category="chore" title="Chores" />}
          {utilTab === 'grocery' && <GroceryList />}
          {utilTab === 'notes' && <FamilyNotes />}
        </div>
      </div>
    </div>
  )
}
