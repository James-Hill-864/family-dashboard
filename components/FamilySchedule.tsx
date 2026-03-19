'use client'
import { useState, useEffect } from 'react'

interface Member { id: string; name: string; color: string; emoji: string }
interface Schedule {
  id: string; dayOfWeek?: number; startTime: string; endTime: string
  label: string; type: string; member: Member
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function FamilySchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const today = new Date().getDay()

  useEffect(() => {
    fetch('/api/schedules').then(r => r.json()).then(setSchedules)
  }, [])

  const todaySchedules = schedules
    .filter(s => s.dayOfWeek === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex-shrink-0 mb-3">
        <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Today
        </div>
        <div className="text-white font-bold" style={{ fontSize: '16px', marginTop: '2px' }}>
          {DAYS[today]}
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto flex-1">
        {todaySchedules.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
            Nothing scheduled today
          </div>
        ) : todaySchedules.map(s => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderLeft: `3px solid ${s.member.color}`,
            }}
          >
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: '32px', height: '32px', background: s.member.color + '20', fontSize: '16px' }}
            >
              {s.member.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium truncate" style={{ fontSize: '13px' }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                {s.member.name} · {s.startTime}–{s.endTime}
              </div>
            </div>
            <div
              className="capitalize rounded-lg px-2 py-0.5 flex-shrink-0"
              style={{
                fontSize: '10px', fontWeight: 600,
                color: s.member.color,
                background: s.member.color + '18',
              }}
            >
              {s.type}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
