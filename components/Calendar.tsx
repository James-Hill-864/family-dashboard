'use client'
import { useState, useEffect, useCallback } from 'react'
import EventModal from './EventModal'
import QuickAddEvent from './QuickAddEvent'

interface Member { id: string; name: string; color: string; emoji: string }
interface CalendarEvent {
  id: string; title: string; description?: string; startTime: string; endTime: string
  allDay: boolean; type: string; color?: string; recurring?: string
  memberId: string; member: Member; source?: string; googleEventId?: string
}
type View = 'month' | 'list'
interface Props { filterMemberIds?: string[] }

const EVENT_TYPE_COLORS: Record<string, string> = {
  appointment: '#8b5cf6', school: '#3b82f6', work: '#6366f1',
  vacation: '#10b981', sports: '#f59e0b', reminder: '#f97316',
  birthday: '#ec4899', countdown: '#14b8a6',
}

// Parse event start as local date — for all-day events stored as UTC midnight,
// use the UTC date components to avoid timezone shift
function eventDate(dateStr: string, allDay?: boolean): Date {
  const d = new Date(dateStr)
  if (allDay) return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return d
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function Calendar({ filterMemberIds }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [view, setView] = useState<View>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const today = new Date()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CalendarEvent[]>([])
  const [searching, setSearching] = useState(false)

  const loadEvents = useCallback(async () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)
    const res = await fetch(`/api/events?start=${start.toISOString()}&end=${end.toISOString()}`)
    if (res.ok) setEvents(await res.json())
  }, [currentDate])

  useEffect(() => {
    loadEvents()
    fetch('/api/members').then(r => r.json()).then(setMembers)
  }, [loadEvents])

  useEffect(() => {
    if (!searchOpen || !searchQuery.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/events/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setSearchResults(data)
      } catch {} finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, searchOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(s => !s)
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen])

  const openAdd = (day: Date) => {
    setSelectedEvent(null)
    setSelectedDay(day)
    setModalOpen(true)
  }

  const openEdit = (e: CalendarEvent, ev: React.MouseEvent) => {
    ev.stopPropagation()
    setSelectedEvent(e)
    setSelectedDay(undefined)
    setModalOpen(true)
  }

  const renderMonthView = () => {
    const visibleEvents = filterMemberIds && filterMemberIds.length > 0
      ? events.filter(e => filterMemberIds.includes(e.memberId))
      : events
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = Array.from({ length: 42 }, (_, i) => {
      const dayNum = i - firstDay + 1
      return (dayNum >= 1 && dayNum <= daysInMonth) ? new Date(year, month, dayNum) : null
    })

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center" style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {d}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dayEvents = visibleEvents.filter(e => isSameDay(eventDate(e.startTime, e.allDay), day))
            const isToday = isSameDay(day, today)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            return (
              <div
                key={i}
                onClick={() => openAdd(day)}
                className="rounded-xl flex flex-col overflow-hidden cursor-pointer"
                style={{
                  background: isToday
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))'
                    : 'rgba(255,255,255,0.015)',
                  border: isToday ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(255,255,255,0.03)',
                  boxShadow: isToday ? '0 0 12px rgba(59,130,246,0.1)' : 'none',
                  padding: '3px',
                  minHeight: '90px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { if (!isToday) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' } }}
                onMouseLeave={e => { if (!isToday) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.03)' } }}
              >
                {/* Date number + badge */}
                <div className="flex items-center justify-between mb-0.5">
                  <div
                    className="font-semibold"
                    style={{
                      fontSize: '12px',
                      color: isToday ? '#60a5fa' : isWeekend ? 'var(--text-2)' : 'var(--text)',
                      width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%',
                      background: isToday ? 'rgba(59,130,246,0.3)' : 'transparent',
                    }}
                  >
                    {day.getDate()}
                  </div>
                  {dayEvents.length > 2 && (
                    <div
                      className="rounded-full flex items-center justify-center"
                      style={{ width: '16px', height: '16px', background: '#3b82f6', fontSize: '9px', color: '#fff', fontWeight: 700 }}
                    >
                      {dayEvents.length}
                    </div>
                  )}
                </div>
                {/* Events */}
                <div className="flex flex-col gap-px overflow-hidden">
                  {dayEvents.slice(0, 2).map(e => {
                    const color = e.color || EVENT_TYPE_COLORS[e.type] || e.member.color
                    return (
                      <div
                        key={e.id}
                        onClick={(ev) => openEdit(e, ev)}
                        className="rounded flex items-center gap-px truncate"
                        style={{ fontSize: '9px', padding: '1px 3px', backgroundColor: color + '28', color }}
                        title={e.title}
                      >
                        <div className="rounded-full flex-shrink-0" style={{ width: '4px', height: '4px', background: e.member.color }} />
                        <span className="truncate font-medium">{e.title}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderListView = () => {
    const visibleEvents = filterMemberIds && filterMemberIds.length > 0
      ? events.filter(e => filterMemberIds.includes(e.memberId))
      : events
    const upcoming = visibleEvents.filter(e => eventDate(e.startTime, e.allDay) >= today).slice(0, 14)
    return (
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {upcoming.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>No upcoming events</div>
        ) : upcoming.map(e => {
          const start = eventDate(e.startTime, e.allDay)
          const color = e.color || EVENT_TYPE_COLORS[e.type] || e.member.color
          return (
            <div
              key={e.id}
              onClick={(ev) => openEdit(e, ev)}
              className="flex gap-3 items-start rounded-2xl px-3 py-2.5 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${color}` }}
            >
              <div style={{ minWidth: '52px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
                  {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                {!e.allDay && <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{formatTime(e.startTime)}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="rounded-full flex-shrink-0" style={{ width: '6px', height: '6px', background: e.member.color }} />
                  <div className="text-white font-medium truncate" style={{ fontSize: '13px' }}>{e.title}</div>
                  {e.source === 'google' && <span style={{ fontSize: '9px', color: '#4285F4', background: 'rgba(66,133,244,0.12)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>G</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                  {e.member.emoji} {e.member.name} · <span className="capitalize">{e.type}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="p-4 h-full flex flex-col" style={{ position: 'relative' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="flex items-center justify-center rounded-xl"
              style={{ width: '36px', height: '36px', color: 'var(--text-2)', fontSize: '22px', background: 'rgba(255,255,255,0.04)' }}
            >‹</button>
            <h2 className="font-bold text-white" style={{ fontSize: '15px', minWidth: '140px', textAlign: 'center' }}>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="flex items-center justify-center rounded-xl"
              style={{ width: '36px', height: '36px', color: 'var(--text-2)', fontSize: '22px', background: 'rgba(255,255,255,0.04)' }}
            >›</button>
          </div>
          <div className="flex items-center gap-2">
            {(['month', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="rounded-lg capitalize"
                style={{
                  fontSize: '11px', padding: '5px 12px', height: '30px',
                  background: view === v ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                  color: view === v ? '#fff' : 'var(--text-2)',
                  fontWeight: 600,
                }}
              >{v}</button>
            ))}
            <button
              onClick={() => setSearchOpen(s => !s)}
              className="flex items-center justify-center rounded-xl"
              style={{ width: '30px', height: '30px', background: searchOpen ? '#3b82f6' : 'rgba(255,255,255,0.05)', fontSize: '14px', lineHeight: 1 }}
              title="Search events (Ctrl+F)"
            >🔍</button>
            <button
              onClick={() => openAdd(new Date())}
              className="flex items-center justify-center rounded-xl font-bold text-white"
              style={{ width: '30px', height: '30px', background: '#3b82f6', fontSize: '18px', lineHeight: 1 }}
              title="Add event"
            >+</button>
          </div>
        </div>
        {searchOpen && (
          <div style={{ padding: '8px 12px', background: '#0a0d14', borderBottom: '1px solid #1a1d2e', display: 'flex', gap: 8 }}>
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              style={{ flex: 1, background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 13, outline: 'none' }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                style={{ padding: '6px 10px', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}>
                ✕ Clear
              </button>
            )}
          </div>
        )}
        {searchOpen && searchQuery ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {searching && <div style={{ color: '#6b7280', fontSize: 13, padding: '12px 0' }}>Searching...</div>}
            {!searching && searchResults.length === 0 && searchQuery && (
              <div style={{ color: '#6b7280', fontSize: 13, padding: '12px 0' }}>No events found for &quot;{searchQuery}&quot;</div>
            )}
            {searchResults.map(event => (
              <div key={event.id}
                onClick={() => { setSelectedEvent(event); setModalOpen(true) }}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #1a1d2e', marginBottom: 6, cursor: 'pointer', background: '#0f1220', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 4, borderRadius: 2, background: event.color || event.member?.color || '#3b82f6', alignSelf: 'stretch', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{event.title}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {new Date(event.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {!event.allDay && ` · ${new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                    {event.member && ` · ${event.member.name}`}
                  </div>
                </div>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#1a1d2e', color: '#9ca3af' }}>{event.type}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {view === 'month' && renderMonthView()}
            {view === 'list' && renderListView()}
          </>
        )}
        <QuickAddEvent members={members} onSaved={loadEvents} />
      </div>

      {modalOpen && (
        <EventModal
          event={selectedEvent}
          defaultDate={selectedDay}
          members={members}
          onClose={() => setModalOpen(false)}
          onSaved={loadEvents}
        />
      )}
    </>
  )
}
