'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getWeatherDescription } from '@/lib/weather'

interface WeatherData {
  current: { temperature: number; windSpeed: number; weatherCode: number; humidity: number; precipitation: number }
  daily: Array<{ date: string; maxTemp: number; minTemp: number; weatherCode: number; precipitationSum: number }>
}

function getCondition(code: number): string {
  if (code === 0 || code === 1) return 'sunny'
  if (code === 2) return 'partlycloudy'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 67) return 'rain'
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow'
  if (code >= 95) return 'thunder'
  return 'sunny'
}

function getWeatherEmoji(code: number): string {
  if (code === 0 || code === 1) return '☀️'
  if (code === 2) return '⛅'
  if (code === 3) return '☁️'
  if (code === 45 || code === 48) return '🌫️'
  if (code >= 51 && code <= 55) return '🌦️'
  if (code >= 61 && code <= 65) return '🌧️'
  if (code >= 71 && code <= 77) return '❄️'
  if (code >= 80 && code <= 82) return '🌨️'
  if (code >= 85 && code <= 86) return '🌨️'
  if (code >= 95) return '⛈️'
  return '🌡️'
}

function SunAnimation() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', perspective: '200px' }}>
      <style>{`
        @keyframes sunRotate3d { from{transform:rotateZ(0deg)} to{transform:rotateZ(360deg)} }
        @keyframes sunGlow3d { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.1)} }
        @keyframes sunPulse { 0%,100%{box-shadow:0 0 30px rgba(251,191,36,0.3),0 0 60px rgba(251,191,36,0.1)} 50%{box-shadow:0 0 40px rgba(251,191,36,0.5),0 0 80px rgba(251,191,36,0.15)} }
        @keyframes rayPulse { 0%,100%{opacity:0.5} 50%{opacity:0.8} }
      `}</style>
      {/* Outer glow ring */}
      <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'140px', height:'140px',
        borderRadius:'50%', background:'radial-gradient(circle, rgba(251,191,36,0.25) 0%, rgba(251,146,60,0.1) 40%, transparent 70%)',
        animation:'sunGlow3d 4s ease-in-out infinite' }} />
      {/* Inner pulse glow */}
      <div style={{ position:'absolute', top:'4px', right:'4px', width:'60px', height:'60px',
        borderRadius:'50%', animation:'sunPulse 3s ease-in-out infinite' }} />
      <svg style={{ position:'absolute', top:'4px', right:'4px', width:'60px', height:'60px', opacity:0.8 }} viewBox="0 0 60 60">
        {/* Outer rays — rotate slowly */}
        <g style={{ transformOrigin:'30px 30px', animation:'sunRotate3d 25s linear infinite' }}>
          {Array.from({length:12}, (_,i) => (
            <line key={`outer-${i}`} x1="30" y1="2" x2="30" y2="9"
              transform={`rotate(${i*30} 30 30)`}
              stroke="rgba(251,191,36,0.35)" strokeWidth="1" strokeLinecap="round"
              style={{ animation: `rayPulse ${2 + (i % 3) * 0.5}s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </g>
        {/* Inner rays — rotate opposite */}
        <g style={{ transformOrigin:'30px 30px', animation:'sunRotate3d 15s linear infinite reverse' }}>
          {Array.from({length:8}, (_,i) => (
            <line key={`inner-${i}`} x1="30" y1="8" x2="30" y2="14"
              transform={`rotate(${i*45} 30 30)`}
              stroke="rgba(251,191,36,0.7)" strokeWidth="2" strokeLinecap="round" />
          ))}
        </g>
        {/* Sun body with gradient */}
        <defs>
          <radialGradient id="sunGrad" cx="40%" cy="40%">
            <stop offset="0%" stopColor="rgba(255,230,100,0.95)" />
            <stop offset="60%" stopColor="rgba(251,191,36,0.9)" />
            <stop offset="100%" stopColor="rgba(245,158,11,0.8)" />
          </radialGradient>
        </defs>
        <circle cx="30" cy="30" r="13" fill="url(#sunGrad)" />
        {/* Highlight spot */}
        <circle cx="26" cy="26" r="4" fill="rgba(255,255,200,0.3)" />
      </svg>
    </div>
  )
}

function PartlyCloudyAnimation() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      <style>{`
        @keyframes cloudDrift1 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(6px)} }
        @keyframes sunRotateSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
      <svg style={{ position:'absolute', top:'4px', right:'8px', width:'44px', height:'44px', opacity:0.7 }} viewBox="0 0 44 44">
        <g style={{ transformOrigin:'22px 22px', animation:'sunRotateSlow 25s linear infinite' }}>
          {Array.from({length:8}, (_,i) => (
            <line key={i} x1="22" y1="4" x2="22" y2="9"
              transform={`rotate(${i*45} 22 22)`}
              stroke="rgba(251,191,36,0.65)" strokeWidth="1.5" strokeLinecap="round" />
          ))}
        </g>
        <circle cx="22" cy="22" r="9" fill="rgba(251,191,36,0.7)" />
      </svg>
      <svg style={{ position:'absolute', top:'14px', right:'2px', width:'70px', height:'36px', animation:'cloudDrift1 6s ease-in-out infinite' }} viewBox="0 0 70 36">
        <circle cx="22" cy="22" r="12" fill="rgba(200,210,230,0.65)" />
        <circle cx="38" cy="18" r="15" fill="rgba(210,220,235,0.7)" />
        <circle cx="54" cy="24" r="10" fill="rgba(200,210,230,0.65)" />
        <rect x="10" y="24" width="54" height="12" fill="rgba(210,220,235,0.7)" rx="3" />
      </svg>
    </div>
  )
}

function CloudyAnimation() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      <style>{`
        @keyframes c1 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(8px)} }
        @keyframes c2 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-6px)} }
      `}</style>
      <svg style={{ position:'absolute', top:'3px', right:'3px', width:'80px', height:'50px', animation:'c1 8s ease-in-out infinite', opacity:0.7 }} viewBox="0 0 80 50">
        <circle cx="26" cy="30" r="16" fill="rgba(130,145,170,0.5)" />
        <circle cx="46" cy="24" r="20" fill="rgba(140,155,180,0.55)" />
        <circle cx="64" cy="30" r="14" fill="rgba(130,145,170,0.5)" />
        <rect x="10" y="32" width="66" height="18" fill="rgba(140,155,180,0.55)" rx="3" />
      </svg>
    </div>
  )
}

/**
 * 3D Weather Canvas — particles have z-depth for parallax.
 * Closer particles (z near 1) are larger, faster, brighter.
 * Farther particles (z near 0) are smaller, slower, dimmer.
 * Rain gets motion blur streaks scaled by depth.
 * Snow gets 3D wobble and subtle blur via opacity.
 */
function WeatherCanvas({ type }: { type: 'rain' | 'snow' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Array<{
    x: number; y: number; z: number
    speed: number; size: number; opacity: number; drift: number
    wobbleOffset: number
  }>>([])
  const animRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  const initParticles = useCallback((w: number, h: number) => {
    const count = type === 'rain' ? 60 : 40
    particlesRef.current = Array.from({ length: count }, () => {
      // z: 0 = far background, 1 = close foreground
      const z = Math.random()
      const depthScale = 0.3 + z * 0.7 // 0.3 to 1.0

      return {
        x: Math.random() * w,
        y: Math.random() * h,
        z,
        speed: type === 'rain'
          ? (2 + Math.random() * 2) * depthScale * 2
          : (0.3 + Math.random() * 0.8) * depthScale * 2,
        size: type === 'rain'
          ? (0.8 + Math.random() * 1) * depthScale * 1.5
          : (1.5 + Math.random() * 3) * depthScale * 1.5,
        opacity: type === 'rain'
          ? (0.15 + z * 0.7)
          : (0.2 + z * 0.6),
        drift: type === 'snow'
          ? (Math.random() - 0.5) * 0.6 * depthScale
          : (-0.2 - Math.random() * 0.5) * depthScale,
        wobbleOffset: Math.random() * Math.PI * 2,
      }
    })
    // Sort by z so far particles render first (painter's algorithm)
    particlesRef.current.sort((a, b) => a.z - b.z)
  }, [type])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      if (particlesRef.current.length === 0) initParticles(canvas.width, canvas.height)
    }
    resize()

    const draw = (timestamp: number) => {
      if (timestamp - lastFrameRef.current < 33) {
        animRef.current = requestAnimationFrame(draw)
        return
      }
      lastFrameRef.current = timestamp

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      for (const p of particlesRef.current) {
        p.y += p.speed
        p.x += p.drift

        if (type === 'snow') {
          // 3D wobble — closer particles wobble more
          p.x += Math.sin(timestamp * 0.0008 + p.wobbleOffset + p.y * 0.015) * (0.2 + p.z * 0.6)
        }

        // Wrap around
        if (p.y > h + 10) { p.y = -(5 + Math.random() * 15); p.x = Math.random() * w }
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10

        ctx.globalAlpha = p.opacity

        if (type === 'rain') {
          // 3D rain: streaks get longer and thicker with depth
          const streakLen = p.speed * (2.5 + p.z * 2)
          const thickness = p.size * (0.5 + p.z * 0.8)

          // Slight glow for close particles
          if (p.z > 0.7) {
            ctx.strokeStyle = 'rgba(170,210,255,0.3)'
            ctx.lineWidth = thickness * 3
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p.x + p.drift * 2.5, p.y + streakLen)
            ctx.stroke()
          }

          // Main streak
          const gradient = ctx.createLinearGradient(p.x, p.y, p.x + p.drift * 2.5, p.y + streakLen)
          gradient.addColorStop(0, 'rgba(147,197,253,0)')
          gradient.addColorStop(0.3, `rgba(147,197,253,${0.4 + p.z * 0.5})`)
          gradient.addColorStop(1, `rgba(200,220,255,${0.6 + p.z * 0.4})`)
          ctx.strokeStyle = gradient
          ctx.lineWidth = thickness
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x + p.drift * 2.5, p.y + streakLen)
          ctx.stroke()

          // Splash effect for close foreground drops hitting bottom
          if (p.z > 0.6 && p.y >= h - 5) {
            ctx.globalAlpha = p.opacity * 0.5
            ctx.fillStyle = 'rgba(180,210,255,0.6)'
            const splashR = 1 + p.z * 2
            ctx.beginPath()
            ctx.ellipse(p.x, h - 1, splashR * 2, splashR * 0.5, 0, 0, Math.PI * 2)
            ctx.fill()
          }
        } else {
          // 3D snow: closer flakes are larger and have a subtle glow
          if (p.z > 0.6) {
            ctx.fillStyle = `rgba(200,220,255,${0.08 + p.z * 0.1})`
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
            ctx.fill()
          }

          // Main flake — slightly warm tint for close ones
          const brightness = Math.floor(200 + p.z * 55)
          ctx.fillStyle = `rgba(${brightness},${brightness + 10},255,${0.7 + p.z * 0.3})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()

          // Inner highlight for close particles
          if (p.z > 0.5) {
            ctx.fillStyle = `rgba(255,255,255,${p.z * 0.4})`
            ctx.beginPath()
            ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.4, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      ctx.globalAlpha = 1
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [type, initParticles])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
    />
  )
}

function RainAnimation() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <WeatherCanvas type="rain" />
    </div>
  )
}

function ThunderAnimation() {
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    let cancelled = false
    const scheduleFlash = (): ReturnType<typeof setTimeout> => {
      const delay = 4000 + Math.random() * 6000
      return setTimeout(() => {
        if (cancelled) return
        setFlash(true)
        setTimeout(() => {
          if (cancelled) return
          setFlash(false)
          setTimeout(() => {
            if (cancelled) return
            setFlash(true)
            setTimeout(() => { if (!cancelled) setFlash(false) }, 80)
          }, 120)
        }, 80)
        scheduleFlash()
      }, delay)
    }
    const t = scheduleFlash()
    return () => { cancelled = true; clearTimeout(t) }
  }, [])
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      <RainAnimation />
      <div style={{ position:'absolute', inset:0, background:'rgba(200,220,255,0.3)', opacity: flash ? 1 : 0, transition: flash ? 'none' : 'opacity 0.3s', pointerEvents:'none' }} />
      {flash && (
        <svg style={{ position:'absolute', top:'10%', right:'18%', width:'24px', height:'50px', opacity:0.9 }} viewBox="0 0 24 50">
          <polyline points="14,0 6,22 13,22 5,50" stroke="rgba(255,240,100,0.95)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

function SnowAnimation() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <WeatherCanvas type="snow" />
    </div>
  )
}

function FogAnimation() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      <style>{`
        @keyframes fogMove1 { 0%{transform:translateX(-8%)} 100%{transform:translateX(8%)} }
        @keyframes fogMove2 { 0%{transform:translateX(4%)} 100%{transform:translateX(-7%)} }
      `}</style>
      {[
        { top:'20%', h:'30%', anim:'fogMove1 12s ease-in-out alternate infinite', op:0.2 },
        { top:'55%', h:'30%', anim:'fogMove2 15s ease-in-out alternate infinite', op:0.15 },
      ].map((f, i) => (
        <div key={i} style={{
          position:'absolute', left:'-10%', right:'-10%', top:f.top, height:f.h,
          background:`linear-gradient(to right, transparent, rgba(180,195,215,${f.op}) 30%, rgba(180,195,215,${f.op}) 70%, transparent)`,
          animation:f.anim, borderRadius:'50%', filter:'blur(6px)',
        }} />
      ))}
    </div>
  )
}

const BG_GRADIENTS: Record<string, string> = {
  sunny:        'linear-gradient(135deg, rgba(251,146,60,0.14) 0%, rgba(234,179,8,0.09) 50%, rgba(251,191,36,0.06) 100%)',
  partlycloudy: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(148,163,184,0.08) 100%)',
  cloudy:       'linear-gradient(135deg, rgba(71,85,105,0.16) 0%, rgba(100,116,139,0.12) 100%)',
  rain:         'linear-gradient(135deg, rgba(23,37,84,0.25) 0%, rgba(37,99,235,0.1) 100%)',
  thunder:      'linear-gradient(135deg, rgba(15,23,42,0.28) 0%, rgba(30,58,138,0.18) 100%)',
  snow:         'linear-gradient(135deg, rgba(186,230,253,0.12) 0%, rgba(224,242,254,0.08) 100%)',
  fog:          'linear-gradient(135deg, rgba(100,116,139,0.15) 0%, rgba(148,163,184,0.1) 100%)',
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/weather')
        if (!res.ok) throw new Error()
        setWeather(await res.json())
      } catch { setError(true) }
    }
    load()
    const iv = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  if (error) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#4a4d6a', fontSize:11 }}>
      Weather unavailable
    </div>
  )
  if (!weather) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', padding:'0 12px', gap:8 }}>
      <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
      <div style={{ flex:1 }}>
        <div style={{ height:12, width:60, borderRadius:4, background:'rgba(255,255,255,0.04)', marginBottom:6 }} />
        <div style={{ height:8, width:100, borderRadius:4, background:'rgba(255,255,255,0.03)' }} />
      </div>
    </div>
  )

  const toF = (c: number) => Math.round(c * 9 / 5 + 32)
  const { current, daily } = weather
  const today = daily[0]
  const condition = getCondition(current.weatherCode)
  const bgGradient = BG_GRADIENTS[condition] || BG_GRADIENTS.sunny

  const AnimComponent: Record<string, React.ComponentType> = {
    sunny: SunAnimation, partlycloudy: PartlyCloudyAnimation, cloudy: CloudyAnimation,
    rain: RainAnimation, thunder: ThunderAnimation, snow: SnowAnimation, fog: FogAnimation,
  }
  const Anim = AnimComponent[condition] || SunAnimation

  // Forecast starts TOMORROW (index 1), next 7 days
  const forecastDays = daily.slice(1, 8)

  return (
    <div style={{ position:'relative', height:'100%', overflow:'hidden', background:bgGradient, transition:'background 2s ease' }}>
      <Anim />
      <div style={{ position:'relative', zIndex:2, height:'100%', display:'flex', flexDirection:'column', padding:'8px 12px 6px' }}>

        {/* Row 1: icon + temp + condition + location — compact single row */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:'2rem', lineHeight:1, filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.5))', flexShrink:0 }}>
            {getWeatherEmoji(current.weatherCode)}
          </span>
          <div style={{ fontWeight:700, color:'#fff', fontSize:'1.75rem', lineHeight:1, letterSpacing:'-0.03em', textShadow:'0 2px 8px rgba(0,0,0,0.6)', flexShrink:0 }}>
            {toF(current.temperature)}°
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.8)', textShadow:'0 1px 4px rgba(0,0,0,0.7)', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {getWeatherDescription(current.weatherCode)}
            </div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.45)', textShadow:'0 1px 3px rgba(0,0,0,0.6)' }}>Taylors, SC</div>
          </div>
        </div>

        {/* Row 2: stats — single compact line */}
        <div style={{ fontSize:8, color:'rgba(255,255,255,0.55)', marginTop:4, textShadow:'0 1px 3px rgba(0,0,0,0.6)', whiteSpace:'nowrap', flexShrink:0 }}>
          {today && <>H:{toF(today.maxTemp)}° L:{toF(today.minTemp)}° · </>}
          {Math.round(current.humidity)}% · {Math.round(current.windSpeed)}mph
        </div>

        {/* Forecast strip — tomorrow through next 7 days */}
        <div style={{ display:'flex', gap:2, marginTop:5, flex:1, alignItems:'stretch' }}>
          {forecastDays.map((day) => (
            <div key={day.date} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1,
              borderRadius:6, padding:'3px 1px',
              background:'rgba(0,0,0,0.18)', backdropFilter:'blur(4px)',
              border:'1px solid rgba(255,255,255,0.07)', minWidth:0,
            }}>
              <div style={{ fontSize:6, color:'rgba(255,255,255,0.5)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.02em' }}>
                {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div style={{ fontSize:'0.85rem', lineHeight:1 }}>{getWeatherEmoji(day.weatherCode)}</div>
              <div style={{ fontSize:7, color:'#fff', fontWeight:700 }}>{toF(day.maxTemp)}°</div>
              <div style={{ fontSize:6, color:'rgba(255,255,255,0.4)' }}>{toF(day.minTemp)}°</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
