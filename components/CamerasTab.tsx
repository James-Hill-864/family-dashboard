'use client'
import { useState, useEffect } from 'react'

interface Camera {
  entity_id: string
  name: string
  state: string
  snapshotUrl: string
  haUrl: string
}

export default function CamerasTab() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCamera, setActiveCamera] = useState<Camera | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch('/api/cameras')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCameras(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setRefreshKey(k => k + 1), 10_000)
    return () => clearInterval(iv)
  }, [])

  if (loading && cameras.length === 0) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4d6a', fontSize: 12 }}>Loading cameras...</div>
  }

  if (cameras.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
        <div style={{ fontSize: 32 }}>📷</div>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>No Cameras Found</div>
        <div style={{ fontSize: 11, color: '#4a4d6a', textAlign: 'center', lineHeight: 1.6 }}>Add camera entities to Home Assistant to see feeds here.</div>
      </div>
    )
  }

  // If a camera is selected, show HA's frontend in an iframe (full tab)
  if (activeCamera) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flexShrink: 0, borderBottom: '1px solid #1a1d2e' }}>
          <button onClick={() => setActiveCamera(null)}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'livePulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{activeCamera.name}</span>
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <iframe
            src={`${activeCamera.haUrl}/lovelace/0?kiosk`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; camera; microphone"
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', flexShrink: 0, borderBottom: '1px solid #1a1d2e' }}>
        <span style={{ fontSize: 9, color: '#4a4d6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
          Cameras ({cameras.length})
        </span>
        <button onClick={() => setRefreshKey(k => k + 1)}
          style={{ fontSize: 12, background: 'none', border: 'none', color: '#6a6d8a', cursor: 'pointer' }}>↻</button>
      </div>

      <div style={{
        flex: 1, overflow: 'auto', padding: 8,
        display: 'grid',
        gridTemplateColumns: cameras.length <= 2 ? '1fr' : 'repeat(2, 1fr)',
        gap: 8,
      }}>
        {cameras.map(cam => {
          const isOnline = cam.state === 'streaming' || cam.state === 'idle'
          return (
            <div key={cam.entity_id}
              onClick={() => setActiveCamera(cam)}
              style={{
                borderRadius: 12, overflow: 'hidden',
                background: '#0a0d14', border: '1px solid #1a1d2e',
                display: 'flex', flexDirection: 'column', cursor: 'pointer',
              }}>
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
                <img
                  src={`${cam.snapshotUrl}${cam.snapshotUrl.includes('?') ? '&' : '?'}t=${refreshKey}`}
                  alt={cam.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isOnline ? '#10b981' : '#ef4444',
                  animation: isOnline ? 'livePulse 2s ease-in-out infinite' : 'none',
                }} />
                <span style={{ fontSize: 10, color: '#e2e8f0', fontWeight: 600, flex: 1 }}>{cam.name}</span>
                <span style={{ fontSize: 9, color: '#4a4d6a', textTransform: 'capitalize' }}>{cam.state}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
