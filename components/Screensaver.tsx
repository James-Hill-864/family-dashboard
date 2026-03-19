'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface Photo { id: string; url: string; name?: string }
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

    const albumId = typeof window !== 'undefined' ? (localStorage.getItem('photosAlbumId') || '') : ''
    const url = `/api/photos${albumId ? `?albumId=${encodeURIComponent(albumId)}` : ''}`
    fetch(url)
      .then(r => r.json())
      .then((data: Photo[]) => {
        if (Array.isArray(data) && data.length > 0) {
          photosRef.current = data
          setPhotos(data)
          setPhotoIdx(0)
          setPhotoVisible(true)
        }
      })
      .catch(() => {})

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

          {/* Photo captions */}
          {currentPhoto?.name && (
            <div style={{
              position: 'absolute', bottom: 48, left: 0, right: 0,
              display: 'flex', justifyContent: 'center', gap: 32,
              fontSize: '13px', color: 'rgba(255,255,255,0.5)',
              textShadow: '0 1px 6px rgba(0,0,0,0.9)',
              opacity: photoVisible ? 1 : 0, transition: 'opacity 0.8s ease-in-out',
            }}>
              <span>{currentPhoto.name.replace(/\.[^.]+$/, '')}</span>
              {nextPhoto?.name && <span>{nextPhoto.name.replace(/\.[^.]+$/, '')}</span>}
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
