'use client'
import { useState, useEffect } from 'react'
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
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`
        @keyframes sunRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes sunGlow { 0%,100%{opacity:0.2} 50%{opacity:0.35} }
      `}</style>
      <div style={{ position:'absolute', top:'-10px', right:'-10px', width:'120px', height:'120px',
        borderRadius:'50%', background:'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)',
        animation:'sunGlow 4s ease-in-out infinite' }} />
      <svg style={{ position:'absolute', top:'4px', right:'4px', width:'60px', height:'60px', opacity:0.7 }} viewBox="0 0 60 60">
        <g style={{ transformOrigin:'30px 30px', animation:'sunRotate 20s linear infinite' }}>
          {Array.from({length:8}, (_,i) => (
            <line key={i} x1="30" y1="6" x2="30" y2="12"
              transform={`rotate(${i*45} 30 30)`}
              stroke="rgba(251,191,36,0.65)" strokeWidth="2" strokeLinecap="round" />
          ))}
        </g>
        <circle cx="30" cy="30" r="13" fill="rgba(251,191,36,0.8)" />
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

function RainAnimation() {
  const drops = Array.from({length:22}, (_, i) => ({
    left: `${(i * 4.7) % 100}%`,
    delay: `${(i * 0.13) % 1.2}s`,
    dur: `${0.65 + (i % 4) * 0.12}s`,
    height: `${12 + (i % 5) * 4}px`,
    opacity: 0.55 + (i % 3) * 0.15,
  }))
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      <style>{`
        @keyframes raindrop {
          0%{transform:translateY(-20px) translateX(-3px);opacity:0}
          15%{opacity:1}
          100%{transform:translateY(110%) translateX(-8px);opacity:0}
        }
      `}</style>
      {drops.map((d, i) => (
        <div key={i} style={{
          position:'absolute', top:0, left:d.left,
          width:'1.5px', height:d.height, borderRadius:'1px',
          background:'linear-gradient(to bottom, transparent, rgba(147,197,253,0.85))',
          opacity:d.opacity,
          animation:`raindrop ${d.dur} linear ${d.delay} infinite`,
        }} />
      ))}
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
  const flakes = Array.from({length:20}, (_, i) => ({
    left: `${(i * 5.1) % 100}%`,
    size: `${5 + (i % 5) * 2}px`,
    delay: `${(i * 0.25) % 3}s`,
    dur: `${2.5 + (i % 5) * 0.6}s`,
    drift: `${(i % 2 === 0 ? 1 : -1) * (6 + (i % 4) * 4)}px`,
    opacity: 0.5 + (i % 4) * 0.1,
  }))
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      <style>{`
        @keyframes snowfall {
          0%{transform:translateY(-10px) translateX(0);opacity:0}
          10%{opacity:1}
          90%{opacity:0.7}
          100%{transform:translateY(110%) translateX(var(--drift));opacity:0}
        }
      `}</style>
      {flakes.map((f, i) => (
        <div key={i} style={{
          position:'absolute', top:0, left:f.left,
          width:f.size, height:f.size, borderRadius:'50%',
          background:'rgba(210,230,255,0.9)', opacity:f.opacity,
          ['--drift' as string]: f.drift,
          animation:`snowfall ${f.dur} ease-in ${f.delay} infinite`,
        }} />
      ))}
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
