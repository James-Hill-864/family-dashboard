'use client'
import { useState, useEffect } from 'react'

interface Member { id: string; name: string; color: string; emoji: string }
interface Schedule { id: string; memberId: string; dayOfWeek: number | null; startTime: string; endTime: string; label: string; type: string }
interface CalEvent { id: string; title: string; startTime: string; endTime: string; memberId: string }
interface Status { label: string; color: string; dot: string }

interface Props {
  onFilterChange: (ids: string[]) => void
  onSettingsOpen: () => void
  avatarRefreshKey: number
}

function getStatus(member: Member, schedules: Schedule[], events: CalEvent[]): Status {
  const now = new Date()
  const dow = now.getDay()
  const timeStr = now.toTimeString().slice(0, 5)

  const activeEvent = events.find(
    e => e.memberId === member.id && new Date(e.startTime) <= now && new Date(e.endTime) >= now
  )
  if (activeEvent) return { label: activeEvent.title.slice(0, 12), color: '#8b5cf6', dot: '#8b5cf6' }

  const memberSchedules = schedules.filter(s => s.memberId === member.id && s.dayOfWeek === dow)
  for (const sched of memberSchedules) {
    if (timeStr >= sched.startTime && timeStr <= sched.endTime) {
      if (sched.type === 'school') return { label: 'School', color: '#3b82f6', dot: '#3b82f6' }
      if (sched.type === 'work') return { label: 'Work', color: '#6366f1', dot: '#6366f1' }
      return { label: sched.label, color: '#f59e0b', dot: '#f59e0b' }
    }
  }

  return { label: 'Home', color: '#10b981', dot: '#10b981' }
}

export default function HeaderAvatars({ onFilterChange, onSettingsOpen, avatarRefreshKey }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [events, setEvents] = useState<CalEvent[]>([])
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set())
  const [avatarTs, setAvatarTs] = useState(() => Date.now())
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const load = async () => {
    try {
      const now = new Date()
      const [mRes, sRes, eRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/schedules'),
        fetch(`/api/events?start=${new Date(now.getTime() - 3600000).toISOString()}&end=${new Date(now.getTime() + 3600000).toISOString()}`),
      ])
      if (mRes.ok) setMembers(await mRes.json())
      if (sRes.ok) setSchedules(await sRes.json())
      if (eRes.ok) setEvents(await eRes.json())
    } catch {}
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    setAvatarTs(Date.now())
    setAvatarErrors(new Set())
    load()
  }, [avatarRefreshKey])

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      onFilterChange(next)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <style>{`
        @keyframes avatarHover { 0%,100%{box-shadow:0 0 0 2px rgba(255,255,255,0.6)} }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {members.map(member => {
          const status = getStatus(member, schedules, events)
          const isActive = activeFilters.includes(member.id)
          const hasError = avatarErrors.has(member.id)
          const isHovered = hoveredId === member.id
          return (
            <div key={member.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => toggleFilter(member.id)}
                onDoubleClick={onSettingsOpen}
                onMouseEnter={() => setHoveredId(member.id)}
                onMouseLeave={() => setHoveredId(null)}
                title={`${member.name} — tap to filter calendar`}
                style={{
                  width: 42, height: 42,
                  borderRadius: '50%',
                  padding: 0,
                  overflow: 'hidden',
                  border: isActive
                    ? '2px solid #fff'
                    : isHovered
                    ? '2px solid rgba(255,255,255,0.7)'
                    : '2px solid transparent',
                  transform: 'scale(1)',
                  transition: 'all 0.15s ease',
                  background: member.color,
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: isHovered ? '0 0 0 2px rgba(255,255,255,0.25)' : 'none',
                }}
              >
                {!hasError ? (
                  <img
                    src={`/api/avatars/${member.id}?t=${avatarTs}`}
                    alt={member.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                    onError={() => setAvatarErrors(prev => { const next = new Set(prev); next.add(member.id); return next })}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    background: member.color,
                    fontSize: 17, fontWeight: 700, color: '#fff',
                  }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              <span style={{ fontSize: 8, color: '#6a6d8a', maxWidth: 46, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.name.split(' ')[0]}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: status.dot }} />
                <span style={{ fontSize: 7, color: status.color, fontWeight: 600 }}>{status.label}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 500, visibility: activeFilters.length > 0 ? 'visible' : 'hidden' }}>
        Showing: {members.filter(m => activeFilters.includes(m.id)).map(m => m.name.split(' ')[0]).join(', ')}
      </div>
    </div>
  )
}
