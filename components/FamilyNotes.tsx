'use client'
import { useState, useEffect } from 'react'

interface Note { id: string; text: string; color: string; createdBy?: string; pinned: boolean }

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444']

export default function FamilyNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [newColor, setNewColor] = useState('#f59e0b')

  const load = () => fetch('/api/notes').then(r => r.json()).then(data => {
    if (Array.isArray(data)) setNotes(data)
  }).catch(() => {})

  useEffect(() => {
    load()
    const iv = setInterval(load, 30_000)
    const handler = () => load()
    window.addEventListener('sse-update', handler)
    return () => { clearInterval(iv); window.removeEventListener('sse-update', handler) }
  }, [])

  const add = async () => {
    if (!newText.trim()) return
    await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText.trim(), color: newColor }),
    })
    setNewText(''); setAdding(false); load()
  }

  const remove = async (id: string) => {
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    load()
  }

  const togglePin = async (note: Note) => {
    await fetch('/api/notes', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: note.id, pinned: !note.pinned }),
    })
    load()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', flexShrink: 0, borderBottom: '1px solid #1a1d2e' }}>
        <span style={{ fontSize: 14 }}>📝</span>
        <span style={{ fontSize: 9, color: '#4a4d6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>Family Notes</span>
        <button onClick={() => setAdding(a => !a)}
          style={{ width: 24, height: 24, borderRadius: 6, background: '#3b82f6', color: '#fff', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          +
        </button>
      </div>

      {adding && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #1a1d2e' }}>
          <input autoFocus value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Add a note..."
            style={{ width: '100%', background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: newColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={add} style={{ padding: '4px 10px', background: '#3b82f6', border: 'none', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Add</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {notes.length === 0 && !adding && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#4a4d6a' }}>
            No notes yet
          </div>
        )}
        {notes.map(note => (
          <div key={note.id} style={{
            padding: '8px 10px', borderRadius: 8,
            background: note.color + '15', borderLeft: `3px solid ${note.color}`,
            display: 'flex', alignItems: 'flex-start', gap: 6,
          }}>
            <div style={{ flex: 1, fontSize: 11, color: '#e2e8f0', lineHeight: 1.5, wordBreak: 'break-word' }}>
              {note.pinned && <span style={{ fontSize: 10, marginRight: 4 }}>📌</span>}
              {note.text}
            </div>
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <button onClick={() => togglePin(note)}
                style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: note.pinned ? '#f59e0b' : '#4a4d6a', padding: 2 }}>
                📌
              </button>
              <button onClick={() => remove(note.id)}
                style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#4a4d6a', padding: 2 }}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
