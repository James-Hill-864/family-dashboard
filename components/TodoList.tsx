'use client'
import { useState, useEffect, useCallback } from 'react'

interface Member { id: string; name: string; color: string; emoji: string }
interface Todo {
  id: string; title: string; done: boolean; priority: string
  category: string; recurring?: string; dueDate?: string; assignee?: Member
}
interface Props { category?: 'todo' | 'chore'; title: string }

function MemberAvatar({ member, size = 22 }: { member: Member; size?: number }) {
  const [imgError, setImgError] = useState(false)
  if (imgError) {
    return (
      <span className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{ width: size, height: size, background: member.color + '30', border: `1px solid ${member.color}60`, fontSize: size * 0.55 }}>
        {member.emoji}
      </span>
    )
  }
  return (
    <img
      src={`/api/avatars/${member.id}`}
      alt={member.name}
      onError={() => setImgError(true)}
      className="flex-shrink-0 rounded-full"
      style={{ width: size, height: size, objectFit: 'cover', border: `1px solid ${member.color}60` }}
    />
  )
}

const RECUR_OPTIONS = [
  { value: '', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export default function TodoList({ category = 'todo', title }: Props) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', assigneeId: '', recurring: '' })

  const accent = category === 'chore' ? '#a855f7' : '#0ea5e9'

  const load = useCallback(async () => {
    const [todosRes, membersRes] = await Promise.all([
      fetch(`/api/todos?category=${category}`),
      fetch('/api/members'),
    ])
    if (todosRes.ok) setTodos(await todosRes.json())
    if (membersRes.ok) setMembers(await membersRes.json())
  }, [category])

  useEffect(() => { load() }, [load])

  const toggle = async (todo: Todo) => {
    // Optimistic update — toggle immediately, then sync with server
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !todo.done }),
    })
    load()
  }

  const submit = async () => {
    if (!form.title.trim()) return
    const body = {
      title: form.title.trim(),
      category,
      assigneeId: form.assigneeId || null,
      recurring: form.recurring || null,
    }
    if (editingId) {
      // Optimistic update for edits
      const assignee = members.find(m => m.id === form.assigneeId) || undefined
      setTodos(prev => prev.map(t => t.id === editingId ? { ...t, title: body.title, assignee, recurring: body.recurring || undefined } : t))
      await fetch(`/api/todos/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    } else {
      // Optimistic add — insert a temporary item so it appears instantly
      const assignee = members.find(m => m.id === form.assigneeId) || undefined
      const tempTodo: Todo = { id: 'temp-' + Date.now(), title: body.title, done: false, priority: 'normal', category, assignee, recurring: body.recurring || undefined }
      setTodos(prev => [tempTodo, ...prev])
      await fetch('/api/todos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    }
    setForm({ title: '', assigneeId: '', recurring: '' })
    setAdding(false)
    setEditingId(null)
    load()
  }

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setForm({ title: todo.title, assigneeId: todo.assignee?.id || '', recurring: todo.recurring || '' })
    setAdding(true)
  }

  const deleteTodo = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    load()
  }

  const cancelForm = () => { setAdding(false); setEditingId(null); setForm({ title: '', assigneeId: '', recurring: '' }) }

  const pending = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  return (
    <div className="p-3 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div style={{ fontSize: '10px', color: accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
          {pending.length > 0 && (
            <span className="ml-1.5 rounded-full inline-flex items-center justify-center"
              style={{ width: '16px', height: '16px', background: accent, color: '#fff', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle' }}>
              {pending.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { if (adding && !editingId) cancelForm(); else { setEditingId(null); setAdding(true) } }}
          className="flex items-center justify-center rounded-lg"
          style={{ width: '26px', height: '26px', background: adding && !editingId ? 'rgba(239,68,68,0.12)' : `${accent}20`, color: adding && !editingId ? '#ef4444' : accent, fontSize: '16px', lineHeight: 1 }}
        >{adding && !editingId ? '×' : '+'}</button>
      </div>

      {/* Add / Edit form */}
      {adding && (
        <div className="mb-2 flex flex-col gap-1.5 flex-shrink-0 rounded-xl p-2" style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}>
          <input
            autoFocus value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') cancelForm() }}
            placeholder="Item title..."
            className="w-full outline-none rounded-lg px-2.5 py-2 text-white"
            style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${accent}40`, fontSize: '13px' }}
          />
          <div className="flex gap-1.5">
            {members.length > 0 && (
              <select
                value={form.assigneeId}
                onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
                className="flex-1 outline-none rounded-lg px-2 py-1.5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', fontSize: '12px' }}
              >
                <option value="" style={{ background: '#0d0d1b' }}>Anyone</option>
                {members.map(m => <option key={m.id} value={m.id} style={{ background: '#0d0d1b' }}>{m.emoji} {m.name}</option>)}
              </select>
            )}
            {category === 'chore' && (
              <select
                value={form.recurring}
                onChange={e => setForm(f => ({ ...f, recurring: e.target.value }))}
                className="flex-1 outline-none rounded-lg px-2 py-1.5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', fontSize: '12px' }}
              >
                {RECUR_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#0d0d1b' }}>{o.label}</option>)}
              </select>
            )}
            <button onClick={submit}
              className="rounded-lg text-white font-bold flex-shrink-0"
              style={{ padding: '6px 12px', background: accent, fontSize: '12px' }}>
              {editingId ? '✓ Save' : '+ Add'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
        {/* Pending */}
        {pending.map(todo => (
          <div key={todo.id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.02)' }}
            onDoubleClick={() => startEdit(todo)}>
            <button
              onClick={() => toggle(todo)}
              className="flex-shrink-0 rounded-full border-2 transition-all"
              style={{ width: '20px', height: '20px', minWidth: '20px', borderColor: `${accent}80`, background: 'transparent' }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-white truncate" style={{ fontSize: '13px' }}>{todo.title}</div>
              {todo.recurring && (
                <div style={{ fontSize: '10px', color: accent, opacity: 0.7 }}>↻ {todo.recurring}</div>
              )}
            </div>
            {todo.assignee && (
              <span title={todo.assignee.name}>
                <MemberAvatar member={todo.assignee} size={22} />
              </span>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => startEdit(todo)}
                style={{ color: accent, fontSize: '12px', background: 'transparent', padding: '2px' }}>✎</button>
              <button onClick={() => deleteTodo(todo.id)}
                style={{ color: '#ef4444', fontSize: '14px', background: 'transparent', padding: '2px' }}>×</button>
            </div>
          </div>
        ))}

        {/* Done */}
        {done.length > 0 && (
          <>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '8px', marginBottom: '4px', paddingLeft: '8px', fontWeight: 600 }}>
              DONE ({done.length})
            </div>
            {done.slice(0, 4).map(todo => (
              <div key={todo.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 opacity-50">
                <button
                  onClick={() => toggle(todo)}
                  className="flex-shrink-0 rounded-full flex items-center justify-center"
                  style={{ width: '20px', height: '20px', minWidth: '20px', background: '#22c55e', border: 'none' }}
                >
                  <span className="text-white" style={{ fontSize: '11px', lineHeight: 1 }}>✓</span>
                </button>
                <span className="flex-1 line-through truncate" style={{ fontSize: '13px', color: 'var(--text-3)' }}>{todo.title}</span>
                {todo.assignee && <MemberAvatar member={todo.assignee} size={18} />}
              </div>
            ))}
          </>
        )}

        {pending.length === 0 && done.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-3)' }}>
            <div style={{ fontSize: '1.5rem' }}>{category === 'chore' ? '🧹' : '✅'}</div>
            <div style={{ fontSize: '12px' }}>Nothing here yet</div>
          </div>
        )}
      </div>
    </div>
  )
}
