'use client'
import { useState, useEffect } from 'react'

interface Package {
  id: string; trackingNumber: string; carrier: string; description?: string
  status: string; lastUpdate?: string; estimatedDelivery?: string; delivered: boolean
}

const CARRIER_ICONS: Record<string, string> = {
  amazon: '📦', usps: '📬', ups: '🟤', fedex: '📫', auto: '📦',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  in_transit: '#3b82f6',
  out_for_delivery: '#8b5cf6',
  delivered: '#10b981',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
}

export default function PackageTracker() {
  const [packages, setPackages] = useState<Package[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ trackingNumber: '', carrier: 'amazon', description: '' })

  const load = () => {
    fetch('/api/packages').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPackages(data)
    }).catch(() => {})
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 5 * 60_000)
    return () => clearInterval(iv)
  }, [])

  const add = async () => {
    if (!form.description.trim()) return
    await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingNumber: form.trackingNumber.trim() || 'N/A',
        carrier: form.carrier,
        description: form.description.trim(),
      }),
    })
    setForm({ trackingNumber: '', carrier: 'amazon', description: '' })
    setAdding(false)
    load()
  }

  const remove = async (id: string) => {
    await fetch(`/api/packages?id=${id}`, { method: 'DELETE' })
    load()
  }

  const toggleDelivered = async (pkg: Package) => {
    await fetch(`/api/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pkg, id: undefined, delivered: !pkg.delivered, status: !pkg.delivered ? 'delivered' : 'in_transit' }),
    })
    // Delete old and reload — simpler than a PATCH endpoint
    await fetch(`/api/packages?id=${pkg.id}`, { method: 'DELETE' })
    load()
  }

  const clearDelivered = async () => {
    await fetch('/api/packages', { method: 'DELETE' })
    load()
  }

  const active = packages.filter(p => !p.delivered)
  const delivered = packages.filter(p => p.delivered)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', flexShrink: 0, borderBottom: '1px solid #1a1d2e' }}>
        <span style={{ fontSize: 14 }}>📦</span>
        <span style={{ fontSize: 9, color: '#4a4d6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>Packages</span>
        {delivered.length > 0 && (
          <button onClick={clearDelivered}
            style={{ fontSize: 9, color: '#6a6d8a', background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear delivered
          </button>
        )}
        <button onClick={() => setAdding(a => !a)}
          style={{ width: 24, height: 24, borderRadius: 6, background: '#3b82f6', color: '#fff', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          +
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #1a1d2e', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            autoFocus
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="What's coming? (e.g. Kids shoes)"
            style={{ width: '100%', background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <select value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))}
              style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 6, padding: '4px 6px', color: '#fff', fontSize: 10, outline: 'none' }}>
              <option value="amazon">Amazon</option>
              <option value="usps">USPS</option>
              <option value="ups">UPS</option>
              <option value="fedex">FedEx</option>
              <option value="auto">Other</option>
            </select>
            <button onClick={add}
              style={{ flex: 1, height: 28, borderRadius: 6, background: '#3b82f6', color: '#fff', fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Add
            </button>
          </div>
        </div>
      )}

      {/* Package list */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {packages.length === 0 && !adding ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#4a4d6a' }}>
            No packages tracked
          </div>
        ) : (
          [...active, ...delivered].map(pkg => (
            <div key={pkg.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
              borderBottom: '1px solid #1a1d2e',
              opacity: pkg.delivered ? 0.5 : 1,
            }}>
              <span style={{ fontSize: 16 }}>{CARRIER_ICONS[pkg.carrier] || '📦'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pkg.description || pkg.trackingNumber}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[pkg.status] || '#6a6d8a' }} />
                  <span style={{ fontSize: 9, color: STATUS_COLORS[pkg.status] || '#6a6d8a', fontWeight: 600 }}>
                    {STATUS_LABELS[pkg.status] || pkg.status}
                  </span>
                  <span style={{ fontSize: 9, color: '#4a4d6a', textTransform: 'uppercase' }}>{pkg.carrier}</span>
                </div>
              </div>
              <button onClick={() => toggleDelivered(pkg)}
                style={{ width: 24, height: 24, borderRadius: 6, background: pkg.delivered ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', fontSize: 12, color: pkg.delivered ? '#10b981' : '#6a6d8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pkg.delivered ? '↩' : '✓'}
              </button>
              <button onClick={() => remove(pkg.id)}
                style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
