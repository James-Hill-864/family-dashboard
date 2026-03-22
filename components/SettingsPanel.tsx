'use client'
import { useState, useEffect, useCallback } from 'react'

interface Member {
  id: string; name: string; color: string; emoji: string; role: string
  googleCalendarId?: string; googleConnected?: boolean
  phoneNumber?: string; notificationPrefs?: string
  email?: string; agendaEmailEnabled?: boolean; agendaEmailTime?: string
  eventReminderMinutes?: number
}

interface Props { onClose: () => void; onMembersUpdated: () => void }

type Tab = 'members' | 'calendar' | 'photos' | 'ha' | 'notifications'

const ROLE_OPTIONS = ['adult', 'teen', 'child']
const COLOR_PRESETS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316']


function AvatarUploader({ member, onUpdated }: { member: Member; onUpdated: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState(`/api/avatars/${member.id}`)
  const [hasPhoto, setHasPhoto] = useState(true)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Invalid file type. Use JPG, PNG, or WebP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum 5MB')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)

    const fd = new FormData()
    fd.append('photo', file)

    try {
      const res = await fetch(`/api/members/${member.id}/avatar`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setAvatarUrl(URL.createObjectURL(file))
      setHasPhoto(true)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
      onUpdated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemove = async () => {
    setUploading(true)
    try {
      await fetch(`/api/members/${member.id}/avatar`, { method: 'DELETE' })
      setHasPhoto(false)
      setAvatarUrl('')
      onUpdated()
    } catch {
      setError('Failed to remove photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5 mb-1">
      {/* Tappable avatar circle — clicking opens file picker */}
      <label style={{ cursor: 'pointer', display: 'block', position: 'relative' }}>
        <div className="rounded-full overflow-hidden flex items-center justify-center"
          style={{ width: '72px', height: '72px', background: member.color + '33', border: `2px solid ${member.color}80` }}>
          {uploading ? (
            <div style={{ fontSize: '22px', animation: 'spin 1s linear infinite' }}>⟳</div>
          ) : success ? (
            <div style={{ fontSize: '28px', color: '#10b981' }}>✓</div>
          ) : hasPhoto ? (
            <img src={avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setHasPhoto(false)} />
          ) : (
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#fff' }}>
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {/* Camera overlay — always shown unless uploading/success */}
        {!uploading && !success && (
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 24, height: 24, borderRadius: '50%',
            background: '#3b82f6', border: '2px solid #0a0a18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12,
          }}>📷</div>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>

      {!hasPhoto && !uploading && !success && (
        <div style={{ fontSize: '10px', color: '#4a4d6a' }}>Tap to add photo</div>
      )}

      {hasPhoto && !uploading && !success && (
        <button onClick={handleRemove}
          className="flex items-center gap-1 rounded-xl font-semibold"
          style={{ height: '26px', padding: '0 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
          Remove photo
        </button>
      )}

      {error && <div style={{ fontSize: '11px', color: '#ef4444', textAlign: 'center' }}>{error}</div>}
    </div>
  )
}

function MemberRow({ member, onUpdated }: { member: Member; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: member.name, emoji: member.emoji, color: member.color, role: member.role })
  const [syncing, setSyncing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const save = async () => {
    await fetch(`/api/members/${member.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setEditing(false)
    onUpdated()
  }

  const remove = async () => {
    await fetch(`/api/members/${member.id}`, { method: 'DELETE' })
    onUpdated()
  }

  const syncGoogleCalendar = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/google/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id }),
      })
      const data = await res.json()
      alert(`Synced ${data.synced ?? 0} events from Google Calendar`)
      onUpdated()
    } catch { alert('Sync failed') }
    finally { setSyncing(false) }
  }

  const hasGoogle = !!member.googleConnected

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {editing ? (
        <>
          <div className="flex flex-col gap-2">
            <input
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="outline-none rounded-xl px-3 py-2.5 text-white w-full"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '14px' }}
            />
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="outline-none rounded-xl px-3 py-2.5 w-full"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text)', fontSize: '14px' }}>
              {ROLE_OPTIONS.map(r => <option key={r} value={r} style={{ background: '#0d0d1b' }} className="capitalize">{r}</option>)}
            </select>
          </div>
          {/* Color picker */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Color:</span>
            {COLOR_PRESETS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                className="rounded-full"
                style={{ width: '24px', height: '24px', background: c, border: form.color === c ? '2px solid #fff' : '2px solid transparent' }}
              />
            ))}
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="rounded cursor-pointer" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', padding: '2px' }} />
          </div>
          <div className="flex gap-2">
            <button onClick={save}
              className="flex-1 rounded-xl text-white font-semibold"
              style={{ height: '44px', background: '#3b82f6', fontSize: '14px' }}>Save</button>
            <button onClick={() => setEditing(false)}
              className="rounded-xl"
              style={{ height: '44px', padding: '0 16px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', fontSize: '14px' }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <AvatarUploader member={member} onUpdated={onUpdated} />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-white font-semibold" style={{ fontSize: '15px' }}>{member.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'capitalize' }}>{member.role}</div>
              {hasGoogle && <div style={{ fontSize: '11px', color: '#4285F4', marginTop: '2px' }}>✓ Google Calendar connected</div>}
            </div>
            <div className="flex items-center gap-2">
              {hasGoogle ? (
                <button onClick={syncGoogleCalendar} disabled={syncing}
                  className="rounded-xl font-semibold"
                  style={{ height: '36px', padding: '0 12px', background: 'rgba(66,133,244,0.15)', color: '#4285F4', fontSize: '12px', border: '1px solid rgba(66,133,244,0.25)' }}>
                  {syncing ? '⟳' : '↻ Sync'}
                </button>
              ) : (
                <a href={`/api/google/auth?memberId=${member.id}`}
                  className="rounded-xl font-semibold inline-flex items-center"
                  style={{ height: '36px', padding: '0 12px', background: 'rgba(66,133,244,0.12)', color: '#4285F4', fontSize: '12px', border: '1px solid rgba(66,133,244,0.2)', textDecoration: 'none' }}>
                  Connect Google
                </a>
              )}
              <button onClick={() => setEditing(true)}
                className="flex items-center justify-center rounded-xl"
                style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', fontSize: '16px' }}>✎</button>
              {!confirmDel ? (
                <button onClick={() => setConfirmDel(true)}
                  className="flex items-center justify-center rounded-xl"
                  style={{ width: '36px', height: '36px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '18px' }}>×</button>
              ) : (
                <button onClick={remove}
                  className="rounded-xl font-bold"
                  style={{ height: '36px', padding: '0 12px', background: '#ef4444', color: '#fff', fontSize: '12px' }}>Delete?</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AddMemberForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', emoji: '👤', color: '#3b82f6', role: 'adult' })

  const save = async () => {
    if (!form.name.trim()) return
    await fetch('/api/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, name: form.name.trim() }),
    })
    setForm({ name: '', emoji: '👤', color: '#3b82f6', role: 'adult' })
    setOpen(false)
    onAdded()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full rounded-2xl flex items-center justify-center gap-2 font-semibold"
      style={{ height: '52px', background: 'rgba(59,130,246,0.08)', border: '1px dashed rgba(59,130,246,0.3)', color: '#3b82f6', fontSize: '14px' }}>
      + Add Family Member
    </button>
  )

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
      <div className="flex flex-col gap-2">
        <input
          autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setOpen(false) }}
          placeholder="Name..."
          className="outline-none rounded-xl px-3 py-2.5 text-white w-full"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '15px' }}
        />
        <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          className="outline-none rounded-xl px-3 py-2.5 w-full"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text)', fontSize: '14px' }}>
          {ROLE_OPTIONS.map(r => <option key={r} value={r} style={{ background: '#0d0d1b' }} className="capitalize">{r}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Color:</span>
        {COLOR_PRESETS.map(c => (
          <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
            className="rounded-full"
            style={{ width: '26px', height: '26px', background: c, border: form.color === c ? '2px solid #fff' : '2px solid transparent' }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={save}
          className="flex-1 rounded-xl text-white font-bold"
          style={{ height: '48px', background: '#3b82f6', fontSize: '14px' }}>Add Member</button>
        <button onClick={() => setOpen(false)}
          className="rounded-xl"
          style={{ height: '48px', padding: '0 16px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', fontSize: '14px' }}>Cancel</button>
      </div>
    </div>
  )
}

function PhotosTab() {
  const [albums, setAlbums] = useState<Array<{ id: string; title: string; mediaItemsCount?: string }>>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') setSelected(localStorage.getItem('photosAlbumId') || '')
    setLoading(true)
    fetch('/api/photos/albums')
      .then(r => r.json())
      .then(data => setAlbums(Array.isArray(data) ? data : []))
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false))
  }, [])

  const pick = (id: string) => {
    setSelected(id)
    if (typeof window !== 'undefined') localStorage.setItem('photosAlbumId', id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-2">
          <span style={{ fontSize: '1.6rem' }}>🖼️</span>
          <div>
            <div className="text-white font-semibold">Google Photos Slideshow</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Displays photos while the screen is idle</div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.7 }}>
          Requires a Google account connected in the Google Cal tab.<br />
          After connecting, you may need to reconnect to grant the photos permission.
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Loading albums…</div>
      ) : albums.length === 0 ? (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: '13px', color: '#ef4444' }}>
            No albums found. Connect Google in the Google Cal tab first, then reconnect to grant Photos access.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '4px' }}>Select album for screensaver:</div>
          {[{ id: '', title: '📷 All Photos', mediaItemsCount: undefined }, ...albums].map(a => (
            <button
              key={a.id}
              onClick={() => pick(a.id)}
              className="rounded-2xl p-3 flex items-center gap-3 text-left"
              style={{
                background: selected === a.id ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected === a.id ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div className="flex-1">
                <div className="text-white font-medium" style={{ fontSize: '14px' }}>{a.title}</div>
                {a.mediaItemsCount && <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{a.mediaItemsCount} items</div>}
              </div>
              {selected === a.id && <div style={{ color: '#3b82f6', fontSize: '18px' }}>✓</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function HATab() {
  const [status, setStatus] = useState<{ connected: boolean; url: string; error?: string } | null>(null)
  const [nightDimmer, setNightDimmer] = useState(true)

  useEffect(() => {
    fetch('/api/ha/status').then(r => r.json()).then(setStatus)
    const stored = localStorage.getItem('nightDimmerEnabled')
    if (stored === 'false') setNightDimmer(false)
  }, [])

  const toggleNightDimmer = (val: boolean) => {
    setNightDimmer(val)
    localStorage.setItem('nightDimmerEnabled', String(val))
    window.dispatchEvent(new Event('nightdimmer-toggle'))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Night Dimmer */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div style={{ fontSize: '1.6rem' }}>🌙</div>
          <div className="flex-1">
            <div className="text-white font-semibold">Night Dimmer</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Dims the screen between 10pm – 6am</div>
          </div>
          <button
            onClick={() => toggleNightDimmer(!nightDimmer)}
            className="flex items-center rounded-full transition-colors"
            style={{ width: '44px', height: '24px', padding: '2px', background: nightDimmer ? '#3b82f6' : 'rgba(255,255,255,0.1)' }}
          >
            <div className="rounded-full bg-white transition-transform" style={{ width: '20px', height: '20px', transform: nightDimmer ? 'translateX(20px)' : 'translateX(0)' }} />
          </button>
        </div>
      </div>

      {/* Home Assistant */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div style={{ fontSize: '1.8rem' }}>🏠</div>
          <div>
            <div className="text-white font-semibold">Home Assistant</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Connection status</div>
          </div>
          {status && (
            <div className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{ background: status.connected ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${status.connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              <div className="rounded-full" style={{ width: '8px', height: '8px', background: status.connected ? '#10b981' : '#ef4444' }} />
              <span style={{ fontSize: '12px', color: status.connected ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                {status.connected ? 'Connected' : 'Offline'}
              </span>
            </div>
          )}
        </div>
        {status && (
          <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.2)', fontSize: '12px', fontFamily: 'monospace' }}>
            <div style={{ color: 'var(--text-2)' }}>URL: <span style={{ color: '#fff' }}>{status.url || 'not set'}</span></div>
            {status.error && <div style={{ color: '#ef4444', marginTop: '4px' }}>Error: {status.error}</div>}
          </div>
        )}
        <div className="mt-3" style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6 }}>
          HA_BASE_URL and HA_TOKEN are configured via the Home Assistant add-on options.<br />
          Go to Settings → Add-ons → Family Dashboard → Configuration to update them.
        </div>
      </div>
    </div>
  )
}

function GoogleCalendarTab({ members, onUpdated }: { members: Member[]; onUpdated: () => void }) {
  const [connectingMemberId, setConnectingMemberId] = useState<string | null>(null)
  const [pasteCode, setPasteCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set())

  const startConnect = (memberId: string) => {
    setConnectingMemberId(memberId)
    setPasteCode('')
    setError(null)
    window.open(`/api/google/auth?memberId=${memberId}`, '_blank')
  }

  const disconnect = async (memberId: string) => {
    if (!confirm('Disconnect this Google account?')) return
    await fetch(`/api/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleAccessToken: null,
        googleRefreshToken: null,
        googleCalendarId: null,
        googleTokenExpiry: null,
      }),
    })
    onUpdated()
  }

  const submitCode = async () => {
    if (!pasteCode.trim() || !connectingMemberId) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pasteCode.trim(), memberId: connectingMemberId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to connect')
      setConnectingMemberId(null)
      setPasteCode('')
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-4" style={{ background: 'rgba(66,133,244,0.06)', border: '1px solid rgba(66,133,244,0.15)' }}>
        <div className="flex items-center gap-3 mb-2">
          <span style={{ fontSize: '1.6rem' }}>📅</span>
          <div>
            <div className="text-white font-semibold">Google Calendar Sync</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Connect each member&apos;s Google account</div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.7 }}>
          Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.<br />
          Set GOOGLE_REDIRECT_URI to <code style={{ color: '#60a5fa' }}>http://localhost:3000/api/google/callback</code> in the Google Console.
        </div>
      </div>

      {/* Manual code paste panel */}
      {connectingMemberId && (
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.3)' }}>
          <div className="text-white font-semibold" style={{ fontSize: '14px' }}>
            Paste authorization code
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6 }}>
            1. A Google sign-in page opened in a new tab. Sign in and grant access.<br />
            2. After granting access, the page will try to redirect to localhost and fail — that&apos;s OK.<br />
            3. Copy the <code style={{ color: '#60a5fa' }}>code</code> value from the URL bar (everything after <code style={{ color: '#60a5fa' }}>code=</code> up to the next <code style={{ color: '#60a5fa' }}>&amp;</code>).<br />
            4. Paste it below and click Connect.
          </div>
          <input
            value={pasteCode}
            onChange={e => setPasteCode(e.target.value)}
            placeholder="Paste the code from the URL here..."
            className="outline-none rounded-xl px-3 py-2.5 text-white w-full"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '13px', fontFamily: 'monospace' }}
          />
          {error && <div style={{ fontSize: '12px', color: '#ef4444' }}>{error}</div>}
          <div className="flex gap-2">
            <button onClick={submitCode} disabled={submitting || !pasteCode.trim()}
              className="flex-1 rounded-xl text-white font-semibold"
              style={{ height: '40px', background: submitting ? '#2563a0' : '#4285F4', fontSize: '13px', opacity: !pasteCode.trim() ? 0.5 : 1 }}>
              {submitting ? 'Connecting...' : 'Connect'}
            </button>
            <button onClick={() => { setConnectingMemberId(null); setPasteCode(''); setError(null) }}
              className="rounded-xl"
              style={{ height: '40px', padding: '0 16px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', fontSize: '13px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {members.map(m => {
        const hasAvatar = !avatarErrors.has(m.id)
        return (
          <div key={m.id} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="rounded-full overflow-hidden flex-shrink-0"
              style={{ width: '40px', height: '40px', background: m.color + '25', border: `2px solid ${m.color}50` }}>
              {hasAvatar ? (
                <img
                  src={`/api/avatars/${m.id}`}
                  alt={m.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setAvatarErrors(prev => { const next = new Set(prev); next.add(m.id); return next })}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  {m.emoji}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">{m.name}</div>
              {m.googleCalendarId
                ? <div style={{ fontSize: '11px', color: '#4285F4' }}>✓ {m.googleCalendarId}</div>
                : <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Not connected</div>}
            </div>
            {m.googleCalendarId ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const res = await fetch('/api/google/sync', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ memberId: m.id }),
                    })
                    const data = await res.json()
                    alert(`Synced ${data.synced ?? 0} events`)
                    onUpdated()
                  }}
                  className="rounded-xl font-semibold"
                  style={{ height: '38px', padding: '0 14px', background: 'rgba(66,133,244,0.15)', color: '#4285F4', fontSize: '12px', border: '1px solid rgba(66,133,244,0.25)' }}>
                  ↻ Sync Now
                </button>
                <button onClick={() => startConnect(m.id)}
                  className="rounded-xl font-semibold"
                  style={{ height: '38px', padding: '0 12px', background: 'rgba(66,133,244,0.08)', color: '#4285F4', fontSize: '11px', border: '1px solid rgba(66,133,244,0.15)' }}>
                  Reconnect
                </button>
                <button onClick={() => disconnect(m.id)}
                  className="rounded-xl font-semibold"
                  style={{ height: '38px', padding: '0 12px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '11px', border: '1px solid rgba(239,68,68,0.15)' }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={() => startConnect(m.id)}
                className="rounded-xl font-semibold"
                style={{ height: '38px', padding: '0 14px', background: '#4285F4', color: '#fff', fontSize: '12px' }}>
                Connect
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

const REMINDER_LABELS: Record<number, string> = { 15: '15min', 30: '30min', 60: '1hr', 120: '2hr', 1440: '1 day' }

function getNotificationPrefs(reminderMinutes: number) {
  return [
    { key: 'eventReminders', label: `Event Reminders (${REMINDER_LABELS[reminderMinutes] || reminderMinutes + 'min'})` },
    { key: 'newEventAdded', label: 'New Event Added' },
    { key: 'choreReminders', label: 'Chore Reminders (9am)' },
    { key: 'mealPlanUpdates', label: 'Meal Plan Updates' },
    { key: 'weatherAlerts', label: 'Weather Alerts' },
    { key: 'announcements', label: 'Announcements' },
  ]
}

function NotificationsTab({ members }: { members: Member[] }) {
  const [emails, setEmails] = useState<Record<string, string>>({})
  const [agendaEmailEnabled, setAgendaEmailEnabled] = useState<Record<string, boolean>>({})
  const [agendaEmailTime, setAgendaEmailTime] = useState<Record<string, string>>({})
  const [eventReminderMinutes, setEventReminderMinutes] = useState<Record<string, number>>({})
  const [prefs, setPrefs] = useState<Record<string, Record<string, boolean>>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [testingEmail, setTestingEmail] = useState<Record<string, boolean>>({})
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized || members.length === 0) return
    const emailMap: Record<string, string> = {}
    const agendaMap: Record<string, boolean> = {}
    const agendaTimeMap: Record<string, string> = {}
    const reminderMap: Record<string, number> = {}
    const prefMap: Record<string, Record<string, boolean>> = {}
    members.forEach(m => {
      emailMap[m.id] = m.email || ''
      agendaMap[m.id] = m.agendaEmailEnabled !== false
      agendaTimeMap[m.id] = m.agendaEmailTime || '07:00'
      reminderMap[m.id] = m.eventReminderMinutes ?? 30
      try { prefMap[m.id] = JSON.parse(m.notificationPrefs || '{}') } catch { prefMap[m.id] = {} }
    })
    setEmails(emailMap)
    setAgendaEmailEnabled(agendaMap)
    setAgendaEmailTime(agendaTimeMap)
    setEventReminderMinutes(reminderMap)
    setPrefs(prefMap)
    setInitialized(true)
  }, [members, initialized])

  const save = async (memberId: string) => {
    setSaving(s => ({ ...s, [memberId]: true }))
    try {
      await fetch(`/api/members/${memberId}/notifications`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationPrefs: prefs[memberId] || {},
          email: emails[memberId],
          agendaEmailEnabled: agendaEmailEnabled[memberId],
          agendaEmailTime: agendaEmailTime[memberId] || '07:00',
          eventReminderMinutes: eventReminderMinutes[memberId] ?? 30,
        }),
      })
    } finally { setSaving(s => ({ ...s, [memberId]: false })) }
  }

  const testEmail = async (memberId: string) => {
    setTestingEmail(t => ({ ...t, [memberId]: true }))
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const data = await res.json()
      if (data.error) alert(`Error: ${data.error}`)
      else alert(data.message || 'Test email sent!')
    } finally { setTestingEmail(t => ({ ...t, [memberId]: false })) }
  }

  const togglePref = (memberId: string, key: string) => {
    setPrefs(p => ({ ...p, [memberId]: { ...(p[memberId] || {}), [key]: !(p[memberId]?.[key]) } }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-2">
          <span style={{ fontSize: '1.6rem' }}>📧</span>
          <div>
            <div className="text-white font-semibold">Email Notifications</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Configure per-member email and preferences</div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.7 }}>
          Requires Gmail configured in the add-on settings.<br />
          Events, chores, weather alerts, and daily agenda sent via email.
        </div>
      </div>
      {members.map(m => {
        const isChild = m.role === 'child'
        const hasAvatar = !avatarErrors.has(m.id)
        return (
          <div key={m.id} className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="rounded-full overflow-hidden flex-shrink-0"
                style={{ width: '40px', height: '40px', background: m.color + '25', border: `2px solid ${m.color}50` }}>
                {hasAvatar ? (
                  <img src={`/api/avatars/${m.id}`} alt={m.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setAvatarErrors(prev => { const n = new Set(prev); n.add(m.id); return n })} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{m.emoji}</div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">{m.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'capitalize' }}>{m.role}</div>
              </div>
            </div>
            {isChild ? (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                Notifications not available for child accounts
              </div>
            ) : (
              <>
                <input
                  type="email"
                  value={emails[m.id] || ''}
                  onChange={e => setEmails(p => ({ ...p, [m.id]: e.target.value }))}
                  placeholder="Email address"
                  style={{ width: '100%', background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }}>
                    <input type="checkbox" checked={agendaEmailEnabled[m.id] !== false}
                      onChange={e => setAgendaEmailEnabled(p => ({ ...p, [m.id]: e.target.checked }))}
                      style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 12, color: '#cbd5e1' }}>Daily agenda at</span>
                  </label>
                  <input type="time" value={agendaEmailTime[m.id] || '07:00'}
                    onChange={e => setAgendaEmailTime(p => ({ ...p, [m.id]: e.target.value }))}
                    style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 12, outline: 'none', colorScheme: 'dark' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>Event reminders</span>
                  <select value={eventReminderMinutes[m.id] ?? 30}
                    onChange={e => setEventReminderMinutes(p => ({ ...p, [m.id]: Number(e.target.value) }))}
                    style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 12, outline: 'none' }}>
                    <option value={15}>15 min before</option>
                    <option value={30}>30 min before</option>
                    <option value={60}>1 hour before</option>
                    <option value={120}>2 hours before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {getNotificationPrefs(eventReminderMinutes[m.id] ?? 30).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={prefs[m.id]?.[key] || false}
                        onChange={() => togglePref(m.id, key)}
                        className="w-4 h-4 rounded" />
                      <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => save(m.id)} disabled={saving[m.id]}
                    className="flex-1 rounded-xl text-white font-semibold"
                    style={{ height: '40px', background: '#3b82f6', fontSize: '13px' }}>
                    {saving[m.id] ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => testEmail(m.id)} disabled={testingEmail[m.id]}
                    className="rounded-xl font-semibold"
                    style={{ height: '40px', padding: '0 10px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '12px', border: '1px solid rgba(59,130,246,0.25)' }}>
                    {testingEmail[m.id] ? '...' : 'Test'}
                  </button>
                  <button onClick={async () => {
                    const res = await fetch('/api/email/agenda', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ memberId: m.id }),
                    })
                    const data = await res.json()
                    if (data.error) alert(`Error: ${data.error}`)
                    else alert(data.message || 'Agenda email sent!')
                  }}
                    className="rounded-xl font-semibold"
                    style={{ height: '40px', padding: '0 10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '12px', border: '1px solid rgba(16,185,129,0.25)' }}>
                    Send Agenda
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function SettingsPanel({ onClose, onMembersUpdated }: Props) {
  const [tab, setTab] = useState<Tab>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [reordering, setReordering] = useState(false)

  const loadMembers = useCallback(() => {
    fetch('/api/members').then(r => r.json()).then(setMembers)
  }, [])

  useEffect(() => {
    loadMembers()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loadMembers, onClose])

  const handleUpdated = () => { loadMembers(); onMembersUpdated() }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'members', label: 'Family', icon: '👨‍👩‍👧' },
    { id: 'calendar', label: 'Google Cal', icon: '📅' },
    { id: 'photos', label: 'Photos', icon: '🖼️' },
    { id: 'ha', label: 'Smart Home', icon: '🏠' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-3xl flex flex-col overflow-hidden"
        style={{ background: '#0a0a18', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0 flex-shrink-0">
          <h2 className="text-white font-bold" style={{ fontSize: '20px' }}>Settings</h2>
          <button onClick={onClose} style={{ color: 'var(--text-3)', fontSize: '24px', background: 'transparent' }}>×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-0 flex-shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 rounded-xl px-4 font-semibold"
              style={{
                height: '40px', fontSize: '13px',
                background: tab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-3)',
                borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 24px' }} />

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-3">
          {tab === 'members' && (
            <>
              <div className="flex items-center justify-end mb-1">
                <button
                  onClick={() => setReordering(r => !r)}
                  className="rounded-xl font-semibold"
                  style={{
                    height: '32px', padding: '0 12px', fontSize: '11px',
                    background: reordering ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                    color: reordering ? '#3b82f6' : '#6a6d8a',
                    border: reordering ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {reordering ? 'Done' : 'Reorder'}
                </button>
              </div>
              {members.map((m, idx) => (
                <div key={m.id} className="flex items-start gap-2">
                  {reordering && (
                    <div className="flex flex-col gap-1 pt-4" style={{ flexShrink: 0 }}>
                      <button
                        onClick={async () => {
                          if (idx === 0) return
                          const ids = members.map(x => x.id)
                          ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
                          await fetch('/api/members/reorder', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids }),
                          })
                          handleUpdated()
                        }}
                        disabled={idx === 0}
                        style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: idx === 0 ? '#2a2d3e' : '#9ca3af', fontSize: 14, border: 'none', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >▲</button>
                      <button
                        onClick={async () => {
                          if (idx === members.length - 1) return
                          const ids = members.map(x => x.id)
                          ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
                          await fetch('/api/members/reorder', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids }),
                          })
                          handleUpdated()
                        }}
                        disabled={idx === members.length - 1}
                        style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: idx === members.length - 1 ? '#2a2d3e' : '#9ca3af', fontSize: 14, border: 'none', cursor: idx === members.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >▼</button>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <MemberRow member={m} onUpdated={handleUpdated} />
                  </div>
                </div>
              ))}
              {!reordering && <AddMemberForm onAdded={handleUpdated} />}
            </>
          )}
          {tab === 'calendar' && <GoogleCalendarTab members={members} onUpdated={handleUpdated} />}
          {tab === 'photos' && <PhotosTab />}
          {tab === 'ha' && <HATab />}
          {tab === 'notifications' && <NotificationsTab members={members} />}
        </div>
      </div>
    </div>
  )
}
