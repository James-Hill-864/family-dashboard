'use client'
import { useState, useEffect } from 'react'

interface Announcement {
  id: string; message: string; createdBy: string; priority: string
  pinned: boolean; expiresAt?: string; createdAt: string
}

interface Member { id: string; name: string }

export default function AnnouncementTicker() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [adding, setAdding] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState({ message: '', createdBy: '', priority: 'normal', expiresIn: 'never', notifySms: false })

  const load = () => {
    fetch('/api/announcements').then(r => r.json()).then(setAnnouncements).catch(() => {})
  }

  useEffect(() => {
    load()
    fetch('/api/members').then(r => r.json()).then(setMembers).catch(() => {})
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [])

  const getExpiresAt = (expiresIn: string): string | undefined => {
    const d = new Date()
    if (expiresIn === 'today') { d.setHours(23, 59, 59, 999); return d.toISOString() }
    if (expiresIn === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(23, 59, 59, 999); return d.toISOString() }
    if (expiresIn === 'week') { d.setDate(d.getDate() + 7); return d.toISOString() }
    return undefined
  }

  const submit = async () => {
    if (!form.message.trim() || !form.createdBy) return
    await fetch('/api/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: form.message.trim(),
        createdBy: form.createdBy,
        priority: form.priority,
        expiresAt: getExpiresAt(form.expiresIn),
        notifySms: form.notifySms,
      }),
    })
    setForm({ message: '', createdBy: '', priority: 'normal', expiresIn: 'never', notifySms: false })
    setAdding(false)
    load()
  }

  const del = async (id: string) => {
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    setExpanded(null)
    load()
  }

  const urgent = announcements.filter(a => a.priority === 'urgent')
  const normal = announcements.filter(a => a.priority !== 'urgent')
  const tickerText = normal.map(a => a.message).join('   •   ')
  const animDuration = Math.max(20, tickerText.length * 0.12)

  return (
    <>
      {/* Urgent banners */}
      {urgent.map(ann => (
        <div key={ann.id} onClick={() => setExpanded(ann.id === expanded ? null : ann.id)}
          style={{
            position: 'fixed', left: 0, right: 0, top: 0, zIndex: 40,
            height: 48, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            cursor: 'pointer',
          }}>
          <span style={{ fontSize: 18 }}>📢</span>
          <span style={{ fontWeight: 700, color: '#fff', flex: 1, fontSize: 14 }}>{ann.message}</span>
          {expanded === ann.id && (
            <button onClick={e => { e.stopPropagation(); del(ann.id) }}
              style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11, borderRadius: 8, padding: '4px 8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Dismiss
            </button>
          )}
        </div>
      ))}

      {/* Footer ticker */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 40, zIndex: 30, background: '#0a0d14', borderTop: '1px solid #1a1d2e', display: 'flex', alignItems: 'center' }}>
        {/* Left label */}
        <div style={{ flexShrink: 0, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>📢</span>
          <span style={{ fontSize: 9, color: '#d97706', fontWeight: 700, letterSpacing: '0.06em' }}>ANNOUNCEMENTS</span>
        </div>

        {/* Ticker */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', maskImage: 'linear-gradient(90deg, transparent 0, black 4%, black 96%, transparent 100%)' }}>
          {normal.length > 0 ? (
            <div
              style={{
                display: 'inline-block', whiteSpace: 'nowrap',
                animation: `ticker ${animDuration}s linear infinite`,
                fontSize: 11, fontWeight: 500,
              }}
              onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
              onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
            >
              <span style={{ color: '#6a6d8a' }}>{tickerText}</span>
              <span style={{ color: '#6a6d8a', marginLeft: 60 }}>{tickerText}</span>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: '#4a4d6a', paddingLeft: 8 }}>No announcements</span>
          )}
        </div>

        {/* Add button */}
        <div style={{ flexShrink: 0, padding: '0 8px' }}>
          <button onClick={() => setAdding(true)} style={{
            width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#4a4d6a', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700,
          }}>+</button>
        </div>
      </div>

      {/* Add modal */}
      {adding && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) setAdding(false) }}>
          <div style={{ background: '#0a0a18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 24, width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>New Announcement</h3>
            <textarea
              autoFocus value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Type your announcement..."
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px', color: '#fff', fontSize: 14, minHeight: 80, resize: 'none', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={form.createdBy} onChange={e => setForm(f => ({ ...f, createdBy: e.target.value }))}
                style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none' }}>
                <option value="" style={{ background: '#0d0d1b' }}>From...</option>
                {members.map(m => <option key={m.id} value={m.id} style={{ background: '#0d0d1b' }}>{m.name}</option>)}
              </select>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none' }}>
                <option value="normal" style={{ background: '#0d0d1b' }}>Normal</option>
                <option value="urgent" style={{ background: '#0d0d1b' }}>Urgent</option>
              </select>
            </div>
            <select value={form.expiresIn} onChange={e => setForm(f => ({ ...f, expiresIn: e.target.value }))}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', width: '100%' }}>
              <option value="today" style={{ background: '#0d0d1b' }}>Expires today</option>
              <option value="tomorrow" style={{ background: '#0d0d1b' }}>Expires tomorrow</option>
              <option value="week" style={{ background: '#0d0d1b' }}>Expires this week</option>
              <option value="never" style={{ background: '#0d0d1b' }}>Never expires</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.notifySms} onChange={e => setForm(f => ({ ...f, notifySms: e.target.checked }))}
                style={{ width: 16, height: 16, borderRadius: 4 }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Notify family via SMS</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submit} style={{ flex: 1, height: 48, background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 12, cursor: 'pointer' }}>Post Announcement</button>
              <button onClick={() => setAdding(false)} style={{ height: 48, padding: '0 16px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: 14, border: 'none', borderRadius: 12, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  )
}
