'use client'
import { useState, useEffect } from 'react'

export default function PhotoOfTheDay() {
  const [photo, setPhoto] = useState<{ url: string; name?: string } | null>(null)

  useEffect(() => {
    // Use today's date as seed to get the same photo all day
    const today = new Date().toISOString().split('T')[0]
    const stored = sessionStorage.getItem('photoOfDay')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.date === today && parsed.photo) {
          setPhoto(parsed.photo)
          return
        }
      } catch { /* ignore */ }
    }

    const albumId = localStorage.getItem('photosAlbumId') || ''
    const url = `/api/photos${albumId ? `?albumId=${encodeURIComponent(albumId)}` : ''}`
    fetch(url).then(r => r.json()).then((photos: Array<{ url: string; name?: string }>) => {
      if (Array.isArray(photos) && photos.length > 0) {
        // Pick based on day of year for consistency
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
        const pick = photos[dayOfYear % photos.length]
        setPhoto(pick)
        sessionStorage.setItem('photoOfDay', JSON.stringify({ date: today, photo: pick }))
      }
    }).catch(() => {})
  }, [])

  if (!photo) return null

  return (
    <div style={{
      width: '100%', height: '100%',
      borderRadius: 12, overflow: 'hidden',
      position: 'relative', background: '#000',
    }}>
      <div style={{
        width: '100%', height: '100%',
        backgroundImage: `url(${photo.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.8,
      }} />
      {photo.name && (
        <div style={{
          position: 'absolute', bottom: 6, left: 8, right: 8,
          fontSize: 9, color: 'rgba(255,255,255,0.6)',
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {photo.name.replace(/\.[^.]+$/, '')}
        </div>
      )}
    </div>
  )
}
