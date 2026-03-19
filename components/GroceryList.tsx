'use client'
import { useState, useEffect } from 'react'

interface GroceryItem {
  id: string; name: string; quantity?: string; unit?: string
  category: string; checked: boolean; addedBy?: string
}

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Beverages', 'Recipe', 'Other']

export default function GroceryList() {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', category: 'Other' })

  const load = () => fetch('/api/grocery').then(r => r.json()).then(setItems).catch(() => {})
  useEffect(() => { load() }, [])

  const toggle = async (item: GroceryItem) => {
    await fetch(`/api/grocery/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: !item.checked }),
    })
    load()
  }

  const addItem = async () => {
    if (!form.name.trim()) return
    await fetch('/api/grocery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, name: form.name.trim() }),
    })
    setForm({ name: '', quantity: '', unit: '', category: 'Other' })
    setAdding(false)
    load()
  }

  const removeItem = async (id: string) => {
    await fetch(`/api/grocery/${id}`, { method: 'DELETE' })
    load()
  }

  const clearChecked = async () => {
    await fetch('/api/grocery', { method: 'DELETE' })
    load()
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat)
    if (catItems.length > 0) acc[cat] = catItems
    return acc
  }, {} as Record<string, GroceryItem[]>)

  const checkedCount = items.filter(i => i.checked).length

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h3 className="font-bold text-white" style={{ fontSize: '13px' }}>Grocery List</h3>
        <div className="flex gap-1">
          {checkedCount > 0 && (
            <button onClick={clearChecked}
              className="rounded-lg text-xs font-medium"
              style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '10px' }}>
              Clear {checkedCount}
            </button>
          )}
          <button onClick={() => setAdding(true)}
            className="flex items-center justify-center rounded-lg font-bold text-white"
            style={{ width: '24px', height: '24px', background: '#10b981', fontSize: '16px', lineHeight: 1 }}>+</button>
        </div>
      </div>

      {adding && (
        <div className="mb-2 p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Item name..."
            className="w-full outline-none rounded-lg px-2 py-1.5 text-white mb-1.5"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '12px' }} />
          <div className="flex gap-1 mb-1.5">
            <input value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              placeholder="Qty" className="outline-none rounded-lg px-2 py-1.5 text-white"
              style={{ width: '50px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '11px' }} />
            <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              placeholder="Unit" className="outline-none rounded-lg px-2 py-1.5 text-white"
              style={{ width: '60px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '11px' }} />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="flex-1 outline-none rounded-lg px-2 py-1.5"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text)', fontSize: '11px' }}>
              {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#0d0d1b' }}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            <button onClick={addItem} className="flex-1 rounded-lg text-white font-semibold"
              style={{ height: '32px', background: '#10b981', fontSize: '12px' }}>Add</button>
            <button onClick={() => setAdding(false)} className="rounded-lg"
              style={{ height: '32px', padding: '0 10px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', fontSize: '12px' }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--text-3)' }}>
            No items — tap + to add
          </div>
        ) : Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <div className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-3)', fontSize: '9px' }}>{cat}</div>
            {catItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 py-1 group">
                <button onClick={() => toggle(item)}
                  className="rounded flex items-center justify-center flex-shrink-0"
                  style={{ width: '18px', height: '18px', border: `2px solid ${item.checked ? '#10b981' : 'rgba(255,255,255,0.2)'}`, background: item.checked ? '#10b981' : 'transparent', fontSize: '10px', color: '#fff' }}>
                  {item.checked ? '✓' : ''}
                </button>
                <span className="flex-1 text-xs" style={{ color: item.checked ? 'var(--text-3)' : 'var(--text)', textDecoration: item.checked ? 'line-through' : 'none', fontSize: '12px' }}>
                  {item.quantity ? `${item.quantity}${item.unit ? ' ' + item.unit : ''} ` : ''}{item.name}
                </span>
                <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100"
                  style={{ color: '#ef4444', fontSize: '14px', background: 'transparent' }}>×</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
