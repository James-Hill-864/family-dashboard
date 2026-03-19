'use client'
import { useState, useEffect, useRef } from 'react'

interface Announcement {
  id: string; message: string; createdBy: string; priority: string
  pinned: boolean; expiresAt?: string; createdAt: string
}

interface Member { id: string; name: string }

interface Props { members: Member[] }

export default function AnnouncementBoard({ members }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [adding, setAdding] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState({ message: '', createdBy: '', priority: 'normal', expiresIn: 'never', notifySms: false })
  const tickerRef = useRef<HTMLDivElement>(null)

  const load = () => fetch('/api/announcements').then(r => r.json()).then(setAnnouncements).catch(() => {})
  useEffect(() => { load() }, [])

  // auto-refresh every 60s
  useEffect(() => {
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [])

  const getExpiresAt = (expiresIn: string): string | undefined => {
    const d = new Date()
    if (expiresIn === 'today') { d.setHours(23,59,59,999); return d.toISOString() }
    if (expiresIn === 'tomorrow') { d.setDate(d.getDate()+1); d.setHours(23,59,59,999); return d.toISOString() }
    if (expiresIn === 'week') { d.setDate(d.getDate()+7); return d.toISOString() }
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

  if (announcements.length === 0 && !adding) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-end"
        style={{ height: '40px', background: 'rgba(7,7,17,0.95)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0 12px' }}>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-lg font-semibold"
          style={{ height: '28px', padding: '0 10px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)', fontSize: '11px' }}>
          + Announcement
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Urgent banners */}
      {urgent.map(ann => (
        <div key={ann.id} onClick={() => setExpanded(ann.id === expanded ? null : ann.id)}
          className="fixed left-0 right-0 z-40 flex items-center gap-3 px-4 cursor-pointer"
          style={{
            top: 0, height: '48px',
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            animation: 'pulse 2s infinite',
          }}>
          <span style={{ fontSize: '18px' }}>📢</span>
          <span className="font-bold text-white flex-1" style={{ fontSize: '14px' }}>{ann.message}</span>
          {expanded === ann.id && (
            <button onClick={e => { e.stopPropagation(); del(ann.id) }}
              className="rounded-lg px-2 py-1 font-semibold"
              style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '11px' }}>Dismiss</button>
          )}
        </div>
      ))}

      {/* Ticker */}
      <div className="fixed bottom-0 left-0 right-0 z-30"
        style={{ height: '40px', background: 'rgba(7,7,17,0.95)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="h-full flex items-center overflow-hidden">
          {normal.length > 0 ? (
            <div className="flex items-center gap-3 w-full overflow-hidden">
              <span className="flex-shrink-0 pl-3" style={{ fontSize: '14px' }}>📢</span>
              <div className="overflow-hidden flex-1" style={{ maskImage: 'linear-gradient(90deg, transparent 0, black 5%, black 95%, transparent 100%)' }}>
                <div
                  ref={tickerRef}
                  className="whitespace-nowrap"
                  style={{
                    fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500,
                    animation: `ticker ${Math.max(15, tickerText.length * 0.15)}s linear infinite`,
                  }}>
                  {tickerText}{'     •     '}{tickerText}
                </div>
              </div>
            </div>
          ) : (
            <div className="pl-4" style={{ fontSize: '12px', color: 'var(--text-3)' }}>No announcements</div>
          )}
          <button onClick={() => setAdding(true)}
            className="flex-shrink-0 flex items-center gap-1 rounded-lg font-semibold mr-3"
            style={{ height: '28px', padding: '0 10px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)', fontSize: '11px' }}>
            + Add
          </button>
        </div>
      </div>

      {/* Add modal */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) setAdding(false) }}>
          <div className="rounded-3xl p-6 w-full max-w-md flex flex-col gap-4"
            style={{ background: '#0a0a18', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-white font-bold" style={{ fontSize: '18px' }}>New Announcement</h3>
            <textarea
              autoFocus value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Type your announcement..."
              className="w-full outline-none rounded-xl px-3 py-2.5 text-white resize-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '14px', minHeight: '80px' }} />
            <div className="flex gap-2">
              <select value={form.createdBy} onChange={e => setForm(f => ({ ...f, createdBy: e.target.value }))}
                className="flex-1 outline-none rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text)', fontSize: '14px' }}>
                <option value="" style={{ background: '#0d0d1b' }}>From...</option>
                {members.map(m => <option key={m.id} value={m.id} style={{ background: '#0d0d1b' }}>{m.name}</option>)}
              </select>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="outline-none rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text)', fontSize: '14px' }}>
                <option value="normal" style={{ background: '#0d0d1b' }}>Normal</option>
                <option value="urgent" style={{ background: '#0d0d1b' }}>Urgent</option>
              </select>
            </div>
            <select value={form.expiresIn} onChange={e => setForm(f => ({ ...f, expiresIn: e.target.value }))}
              className="outline-none rounded-xl px-3 py-2.5 w-full"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text)', fontSize: '14px' }}>
              <option value="today" style={{ background: '#0d0d1b' }}>Expires today</option>
              <option value="tomorrow" style={{ background: '#0d0d1b' }}>Expires tomorrow</option>
              <option value="week" style={{ background: '#0d0d1b' }}>Expires this week</option>
              <option value="never" style={{ background: '#0d0d1b' }}>Never expires</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.notifySms} onChange={e => setForm(f => ({ ...f, notifySms: e.target.checked }))}
                className="w-4 h-4 rounded" />
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>Notify family via SMS</span>
            </label>
            <div className="flex gap-2">
              <button onClick={submit} className="flex-1 rounded-xl text-white font-bold"
                style={{ height: '48px', background: '#f59e0b', fontSize: '14px' }}>Post Announcement</button>
              <button onClick={() => setAdding(false)} className="rounded-xl"
                style={{ height: '48px', padding: '0 16px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', fontSize: '14px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
