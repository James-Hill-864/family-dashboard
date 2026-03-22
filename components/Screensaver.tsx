'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface Photo { id: string; url: string; name?: string; yearsAgo?: number; year?: number }
interface Props { children: React.ReactNode; familyName?: string }

const IDLE_MS = 5 * 60 * 1000
const PHOTO_INTERVAL_MS = 15 * 1000

export default function Screensaver({ children, familyName }: Props) {
  const [dimmed, setDimmed] = useState(false)
  const [now, setNow] = useState(new Date())
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photoIdx, setPhotoIdx] = useState(0)
  const [photoVisible, setPhotoVisible] = useState(true)
  const [clockPos, setClockPos] = useState({ x: 0, y: 0 })
  const [isOnThisDay, setIsOnThisDay] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const photoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const photosRef = useRef<Photo[]>([])

  const resetTimer = useCallback(() => {
    setDimmed(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDimmed(true), IDLE_MS)
  }, [])

  // Load photos and start slideshow when screensaver activates
  useEffect(() => {
    if (!dimmed) {
      if (photoTimerRef.current) clearInterval(photoTimerRef.current)
      setPhotos([])
      photosRef.current = []
      return
    }

    const loadPhotos = async () => {
      // Try "On This Day" photos first
      try {
        const otdRes = await fetch('/api/photos/onthisday')
        const otdData = await otdRes.json()
        if (Array.isArray(otdData) && otdData.length > 0) {
          const otdPhotos = otdData.map((p: { id: string; url: string; name?: string; yearsAgo?: number; year?: number }) => ({
            id: p.id, url: p.url, name: p.name, yearsAgo: p.yearsAgo, year: p.year,
          }))
          photosRef.current = otdPhotos
          setPhotos(otdPhotos)
          setIsOnThisDay(true)
          setPhotoIdx(0)
          setPhotoVisible(true)
          return
        }
      } catch {}

      // Fall back to regular album photos
      const albumId = typeof window !== 'undefined' ? (localStorage.getItem('photosAlbumId') || '') : ''
      const url = `/api/photos${albumId ? `?albumId=${encodeURIComponent(albumId)}` : ''}`
      try {
        const res = await fetch(url)
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          photosRef.current = data
          setPhotos(data)
          setIsOnThisDay(false)
          setPhotoIdx(0)
          setPhotoVisible(true)
        }
      } catch {}
    }

    loadPhotos()

    photoTimerRef.current = setInterval(() => {
      if (photosRef.current.length === 0) return
      setPhotoVisible(false)
      setTimeout(() => {
        setPhotoIdx(i => (i + 2) % photosRef.current.length)
        setPhotoVisible(true)
      }, 800)
    }, PHOTO_INTERVAL_MS)

    return () => {
      if (photoTimerRef.current) clearInterval(photoTimerRef.current)
    }
  }, [dimmed])

  // Drift effect for burn-in prevention
  useEffect(() => {
    if (!dimmed) return
    const move = () => setClockPos({ x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 150 })
    move()
    const iv = setInterval(move, 45000)
    return () => clearInterval(iv)
  }, [dimmed])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    resetTimer()
    const clockIv = setInterval(() => setNow(new Date()), 1000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      clearInterval(clockIv)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('touchstart', resetTimer)
    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('keydown', resetTimer)
    return () => {
      window.removeEventListener('touchstart', resetTimer)
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('keydown', resetTimer)
    }
  }, [resetTimer])

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const currentPhoto = photos[photoIdx]
  const nextPhoto = photos.length > 1 ? photos[(photoIdx + 1) % photos.length] : null

  const getPhotoCaption = (photo: Photo) => {
    if (isOnThisDay && photo.yearsAgo && photo.yearsAgo > 0) {
      return `${photo.yearsAgo} year${photo.yearsAgo !== 1 ? 's' : ''} ago`
    }
    if (photo.name) return photo.name.replace(/\.[^.]+$/, '')
    return ''
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden" onClick={resetTimer}>
      <div
        className="w-full h-full transition-opacity duration-1000"
        style={{ opacity: dimmed ? 0 : 1, pointerEvents: dimmed ? 'none' : 'auto' }}
      >
        {children}
      </div>

      {dimmed && (
        <div className="absolute inset-0 select-none" style={{ background: '#000' }}>
          {/* Photo background — side by side */}
          {currentPhoto && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', gap: 8, padding: 8,
              opacity: photoVisible ? 1 : 0,
              transition: 'opacity 0.8s ease-in-out',
            }}>
              <div style={{
                flex: 1,
                backgroundImage: `url(${currentPhoto.url})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                borderRadius: 12,
              }} />
              {nextPhoto && (
                <div style={{
                  flex: 1,
                  backgroundImage: `url(${nextPhoto.url})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  borderRadius: 12,
                }} />
              )}
            </div>
          )}
          {/* Bottom gradient for readability */}
          {currentPhoto && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.1) 100%)',
            }} />
          )}

          {/* "On This Day" badge */}
          {isOnThisDay && currentPhoto && (
            <div style={{
              position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(59,130,246,0.85)', backdropFilter: 'blur(8px)',
              padding: '8px 20px', borderRadius: 24,
              fontSize: 14, fontWeight: 600, color: '#fff',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              opacity: photoVisible ? 1 : 0, transition: 'opacity 0.8s ease-in-out',
            }}>
              📸 On This Day
            </div>
          )}

          {/* Clock */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div style={{ transform: `translate(${clockPos.x}px, ${clockPos.y}px)`, transition: 'transform 4s ease-in-out' }}>
              <div className="flex flex-col items-center">
                <div
                  className="font-bold text-white tabular-nums"
                  style={{ fontSize: '8rem', lineHeight: 1, letterSpacing: '-0.04em', textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}
                >
                  {timeStr}
                </div>
                <div
                  className="mt-4"
                  style={{ fontSize: '1.5rem', color: currentPhoto ? 'rgba(255,255,255,0.85)' : '#4a4a70', textShadow: '0 1px 10px rgba(0,0,0,0.9)' }}
                >
                  {dateStr}
                </div>
                {familyName && (
                  <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>{familyName}</div>
                )}
              </div>
            </div>
          </div>

          {/* Photo captions with "X years ago" */}
          {currentPhoto && (getPhotoCaption(currentPhoto) || (nextPhoto && getPhotoCaption(nextPhoto))) && (
            <div style={{
              position: 'absolute', bottom: 48, left: 0, right: 0,
              display: 'flex', justifyContent: 'center', gap: 32,
              opacity: photoVisible ? 1 : 0, transition: 'opacity 0.8s ease-in-out',
            }}>
              {[currentPhoto, nextPhoto].filter(Boolean).map((photo, i) => {
                const caption = getPhotoCaption(photo!)
                if (!caption) return null
                return (
                  <div key={i} style={{
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                    padding: '6px 16px', borderRadius: 20,
                    fontSize: 13, color: 'rgba(255,255,255,0.8)',
                    fontWeight: 500,
                  }}>
                    {caption}
                  </div>
                )
              })}
            </div>
          )}

          {/* Tap hint */}
          <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', fontSize: '12px', color: currentPhoto ? 'rgba(255,255,255,0.3)' : '#2a2a40', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Tap to wake
          </div>
        </div>
      )}
    </div>
  )
}
