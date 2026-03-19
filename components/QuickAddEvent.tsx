'use client'
import { useState } from 'react'

interface Member { id: string; name: string; color: string; emoji: string }
interface Props { members: Member[]; onSaved: () => void }

export default function QuickAddEvent({ members, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [memberId, setMemberId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpen = () => {
    setOpen(true)
    setTitle('')
    setMemberId(members[0]?.id || '')
  }

  const save = async () => {
    if (!title.trim() || !memberId) return
    setSaving(true)
    try {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), memberId, allDay: true, type: 'appointment',
          startTime: now.toISOString(), endTime: end.toISOString(), source: 'local',
        }),
      })
      setOpen(false)
      setTitle('')
      onSaved()
    } finally { setSaving(false) }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        title="Quick add event"
        style={{
          position: 'absolute', bottom: 16, right: 16, width: 56, height: 56,
          borderRadius: '50%', background: '#3b82f6', color: '#fff',
          fontSize: 28, fontWeight: 700, border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}
      >
        +
      </button>
    )
  }

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16, left: 16, zIndex: 10,
      background: '#0d0d1b', borderRadius: 16, padding: 16,
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="Event title..."
        style={{
          width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 16, outline: 'none',
          boxSizing: 'border-box', marginBottom: 12,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: '#6a6d8a', flexShrink: 0 }}>Who:</span>
        {members.map(m => (
          <button
            key={m.id}
            onClick={() => setMemberId(m.id)}
            style={{
              width: 40, height: 40, borderRadius: '50%', fontSize: 18,
              background: memberId === m.id ? m.color + '40' : 'rgba(255,255,255,0.05)',
              border: memberId === m.id ? `2px solid ${m.color}` : '2px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {m.emoji}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={save}
          disabled={saving || !title.trim()}
          style={{
            flex: 1, height: 48, borderRadius: 12, background: '#3b82f6', color: '#fff',
            fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
            opacity: (!title.trim() || saving) ? 0.5 : 1,
          }}
        >
          {saving ? 'Adding...' : 'Add Today'}
        </button>
        <button
          onClick={() => setOpen(false)}
          style={{
            height: 48, padding: '0 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.06)', color: '#9ca3af',
            fontSize: 14, border: 'none', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
