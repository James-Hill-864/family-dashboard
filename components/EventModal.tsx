'use client'
import { useState, useEffect } from 'react'

interface Member { id: string; name: string; color: string; emoji: string }
interface CalendarEvent {
  id: string; title: string; description?: string; startTime: string; endTime: string
  allDay: boolean; type: string; color?: string; recurring?: string
  memberId: string; member: Member
}

interface Props {
  event?: CalendarEvent | null
  defaultDate?: Date
  members: Member[]
  onClose: () => void
  onSaved: () => void
}

const EVENT_TYPES = ['appointment', 'school', 'work', 'vacation', 'sports', 'reminder', 'birthday', 'countdown']
const EVENT_TYPE_COLORS: Record<string, string> = {
  appointment: '#8b5cf6', school: '#3b82f6', work: '#6366f1',
  vacation: '#10b981', sports: '#f59e0b', reminder: '#f97316',
  birthday: '#ec4899', countdown: '#14b8a6',
}
const RECUR_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateForInput(dateStr: string, timeOnly = false) {
  const d = new Date(dateStr)
  if (timeOnly) return toLocalISO(d).slice(11, 16)
  return toLocalISO(d).slice(0, 16)
}

export default function EventModal({ event, defaultDate, members, onClose, onSaved }: Props) {
  const isEdit = !!event
  const defaultMemberId = members[0]?.id || ''
  const now = defaultDate || new Date()
  const defaultStart = new Date(now)
  defaultStart.setMinutes(0, 0, 0)
  const defaultEnd = new Date(defaultStart)
  defaultEnd.setHours(defaultStart.getHours() + 1)

  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [type, setType] = useState(event?.type || 'appointment')
  const [memberId, setMemberId] = useState(event?.memberId || defaultMemberId)
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [startTime, setStartTime] = useState(
    event ? formatDateForInput(event.startTime) : toLocalISO(defaultStart)
  )
  const [endTime, setEndTime] = useState(
    event ? formatDateForInput(event.endTime) : toLocalISO(defaultEnd)
  )
  const [recurring, setRecurring] = useState(event?.recurring || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [conflicts, setConflicts] = useState<Array<{ title: string; time: string }>>([])

  // Check for conflicts when time or member changes
  useEffect(() => {
    if (allDay || !memberId || !startTime || !endTime) { setConflicts([]); return }
    const s = new Date(startTime)
    const e = new Date(endTime)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return
    const dayStart = new Date(s); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(s); dayEnd.setHours(23, 59, 59, 999)
    fetch(`/api/events?start=${dayStart.toISOString()}&end=${dayEnd.toISOString()}`)
      .then(r => r.json())
      .then((events: Array<{ id: string; title: string; startTime: string; endTime: string; memberId: string; allDay?: boolean }>) => {
        const overlapping = events.filter(ev => {
          if (isEdit && ev.id === event?.id) return false
          if (ev.memberId !== memberId || ev.allDay) return false
          const evStart = new Date(ev.startTime)
          const evEnd = new Date(ev.endTime)
          return s < evEnd && e > evStart
        }).map(ev => ({
          title: ev.title,
          time: new Date(ev.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        }))
        setConflicts(overlapping)
      })
      .catch(() => setConflicts([]))
  }, [startTime, endTime, memberId, allDay, isEdit, event?.id])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const save = async () => {
    if (!title.trim() || !memberId) return
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        type, memberId, allDay,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        recurring: recurring || null,
        source: 'local',
      }
      if (isEdit) {
        await fetch(`/api/events/${event!.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/events', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      }
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  const deleteEvent = async () => {
    if (!event) return
    setDeleting(true)
    try {
      await fetch(`/api/events/${event.id}`, { method: 'DELETE' })
      onSaved(); onClose()
    } finally { setDeleting(false) }
  }

  const accent = EVENT_TYPE_COLORS[type] || '#3b82f6'
  const selectedMember = members.find(m => m.id === memberId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-3xl flex flex-col overflow-hidden"
        style={{ background: '#0d0d1b', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: `2px solid ${accent}` }}>
          <h2 className="text-white font-bold text-lg">{isEdit ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} className="text-2xl" style={{ color: 'var(--text-3)', background: 'transparent' }}>×</button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Title *
            </label>
            <input
              autoFocus value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save() }}
              placeholder="Event title..."
              className="w-full rounded-xl px-4 py-3 text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '15px' }}
            />
          </div>

          {/* Type + Member row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Type</label>
              <select
                value={type} onChange={e => setType(e.target.value)}
                className="w-full rounded-xl px-3 py-3 outline-none capitalize"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: accent, fontSize: '14px', fontWeight: 600 }}
              >
                {EVENT_TYPES.map(t => <option key={t} value={t} style={{ color: '#fff', background: '#0d0d1b' }} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Who</label>
              <select
                value={memberId} onChange={e => setMemberId(e.target.value)}
                className="w-full rounded-xl px-3 py-3 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: selectedMember?.color || '#fff', fontSize: '14px', fontWeight: 600 }}
              >
                {members.map(m => (
                  <option key={m.id} value={m.id} style={{ color: '#fff', background: '#0d0d1b' }}>
                    {m.emoji} {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAllDay(v => !v)}
              className="flex items-center rounded-full transition-colors"
              style={{ width: '44px', height: '24px', padding: '2px', background: allDay ? accent : 'rgba(255,255,255,0.1)' }}
            >
              <div className="rounded-full bg-white transition-transform" style={{ width: '20px', height: '20px', transform: allDay ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
            <span style={{ fontSize: '14px', color: 'var(--text-2)' }}>All day</span>
          </div>

          {/* Date/time */}
          {allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Start</label>
                <input type="date" value={startTime.slice(0, 10)} onChange={e => setStartTime(e.target.value + 'T00:00')}
                  className="w-full rounded-xl px-3 py-3 text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="block mb-1.5" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>End</label>
                <input type="date" value={endTime.slice(0, 10)} onChange={e => setEndTime(e.target.value + 'T23:59')}
                  className="w-full rounded-xl px-3 py-3 text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', colorScheme: 'dark' }} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Start</label>
                <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full rounded-xl px-3 py-3 text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="block mb-1.5" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>End</label>
                <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full rounded-xl px-3 py-3 text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', colorScheme: 'dark' }} />
              </div>
            </div>
          )}

          {/* Repeat */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Repeat</label>
            <select
              value={recurring} onChange={e => setRecurring(e.target.value)}
              className="w-full rounded-xl px-3 py-3 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', fontSize: '14px' }}
            >
              {RECUR_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ color: '#fff', background: '#0d0d1b' }}>{o.label}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Notes</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full rounded-xl px-4 py-3 text-white outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <div className="mx-6 mb-2 rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>Schedule Conflict</div>
            {conflicts.map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: '#fbbf24' }}>{c.title} at {c.time}</div>
            ))}
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {isEdit && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl font-semibold"
              style={{ padding: '0 20px', height: '52px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: '14px', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              Delete
            </button>
          )}
          {isEdit && confirmDelete && (
            <button
              onClick={deleteEvent}
              disabled={deleting}
              className="rounded-xl font-bold"
              style={{ padding: '0 20px', height: '52px', background: '#ef4444', color: '#fff', fontSize: '14px' }}
            >
              {deleting ? 'Deleting…' : 'Confirm Delete'}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="rounded-xl"
            style={{ padding: '0 20px', height: '52px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', fontSize: '14px' }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="rounded-xl font-bold text-white"
            style={{ padding: '0 28px', height: '52px', background: accent, fontSize: '14px', opacity: (!title.trim() || saving) ? 0.5 : 1 }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
