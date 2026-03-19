'use client'
import { useState, useEffect } from 'react'

export default function CamerasTab() {
  const [haUrl, setHaUrl] = useState('')

  useEffect(() => {
    fetch('/api/cameras')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0 && data[0].haUrl) {
          setHaUrl(data[0].haUrl)
        }
      })
      .catch(() => {})
  }, [])

  if (!haUrl) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
        <div style={{ fontSize: 32 }}>📷</div>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Loading Cameras...</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <iframe
        src={`${haUrl}/lovelace/cameras`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; camera; microphone"
      />
    </div>
  )
}
