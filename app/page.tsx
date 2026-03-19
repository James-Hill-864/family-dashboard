'use client'
import { useState, useEffect, useCallback } from 'react'
import Screensaver from '@/components/Screensaver'
import HeaderAvatars from '@/components/HeaderAvatars'
import Calendar from '@/components/Calendar'
import TodayTab from '@/components/TodayTab'
import SmartHomePanel from '@/components/SmartHomePanel'
import CamerasTab from '@/components/CamerasTab'
import MealPlanner from '@/components/MealPlanner'
import SettingsPanel from '@/components/SettingsPanel'
import AnnouncementTicker from '@/components/AnnouncementTicker'
import NightDimmer from '@/components/NightDimmer'
import MorningBriefing from '@/components/MorningBriefing'
import BirthdayBanner from '@/components/BirthdayBanner'
import { useSwipe } from '@/lib/useSwipe'

type RightTab = 'today' | 'smarthome' | 'cameras' | 'meals'

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [familyName, setFamilyName] = useState('The Hill Family')
  const [calendarFilter, setCalendarFilter] = useState<string[]>([])
  const [rightTab, setRightTab] = useState<RightTab>('today')
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0)
  const [now, setNow] = useState(new Date())
  const [sseConnected, setSseConnected] = useState(false)
  const [showBriefing, setShowBriefing] = useState(false)

  useEffect(() => {
    // Auto-redirect mobile browsers to /mobile
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isNarrow = window.innerWidth < 900
    if ((isMobile || isNarrow) && !window.location.search.includes('desktop=true')) {
      window.location.href = '/mobile'
      return
    }

    fetch('/api/config').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.familyName) setFamilyName(d.familyName)
    }).catch(() => {})
    fetch('/api/init').catch(() => {})
    // Show morning briefing on first load between 6am-9am
    const hour = new Date().getHours()
    const briefingShown = sessionStorage.getItem('briefingShown')
    const today = new Date().toISOString().split('T')[0]
    if (hour >= 6 && hour < 9 && briefingShown !== today) {
      setShowBriefing(true)
      sessionStorage.setItem('briefingShown', today)
    }
    if (window.location.search.includes('settings=true')) {
      setSettingsOpen(true)
      window.history.replaceState({}, '', '/')
    }
    const clockIv = setInterval(() => setNow(new Date()), 1000)
    // SSE real-time sync
    const connectSSE = () => {
      const es = new EventSource('/api/events/stream')
      es.onopen = () => setSseConnected(true)
      es.onerror = () => {
        setSseConnected(false)
        es.close()
        setTimeout(connectSSE, 5000)
      }
      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'connected') setSseConnected(true)
          // Components re-fetch on their own polling intervals, SSE just triggers immediate refresh
          // Dispatch a custom event that components can listen to
          window.dispatchEvent(new CustomEvent('sse-update', { detail: msg }))
        } catch {}
      }
      return es
    }
    const es = connectSSE()
    return () => { clearInterval(clockIv); es.close() }
  }, [])

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const RIGHT_TABS: { id: RightTab; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'meals', label: 'Kitchen' },
    { id: 'smarthome', label: 'Smart Home' },
    { id: 'cameras', label: 'Cameras' },
  ]

  const tabOrder: RightTab[] = ['today', 'meals', 'smarthome', 'cameras']
  const swipeLeft = useCallback(() => {
    setRightTab(t => tabOrder[Math.min(tabOrder.indexOf(t) + 1, tabOrder.length - 1)])
  }, [])
  const swipeRight = useCallback(() => {
    setRightTab(t => tabOrder[Math.max(tabOrder.indexOf(t) - 1, 0)])
  }, [])
  const swipeRef = useSwipe(swipeLeft, swipeRight)

  return (
    <Screensaver familyName={familyName}>
      <div style={{ width: '100vw', height: '100vh', display: 'grid', gridTemplateRows: '90px 1fr 40px', background: '#070711', overflow: 'hidden' }}>

        {/* HEADER */}
        <header style={{ display: 'flex', alignItems: 'center', padding: '0 16px', background: '#0a0d14', borderBottom: '1px solid #1a1d2e', position: 'relative', overflow: 'visible' }}>
          {/* Left */}
          <div style={{ flexShrink: 0, width: 180 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{familyName}</div>
            <div style={{ fontSize: 9, color: '#4a4d6a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Family Dashboard</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sseConnected ? '#22c55e' : '#ef4444', display: 'inline-block', animation: sseConnected ? 'livePulse 2s ease-in-out infinite' : 'none' }} />
              <span style={{ fontSize: 8, color: sseConnected ? '#22c55e' : '#ef4444', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
                {sseConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          {/* Center */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <HeaderAvatars
              onFilterChange={setCalendarFilter}
              onSettingsOpen={() => setSettingsOpen(true)}
              avatarRefreshKey={avatarRefreshKey}
            />
          </div>
          {/* Right */}
          <div style={{ flexShrink: 0, width: 200, textAlign: 'right', paddingRight: 48 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, textShadow: '0 0 20px rgba(59,130,246,0.3)' }}>{timeStr}</div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{dateStr}</div>
          </div>
          {/* Settings gear */}
          <button onClick={() => setSettingsOpen(true)} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)', fontSize: 18, color: '#4a4d6a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>⚙️</button>
        </header>

        {/* MAIN */}
        <div style={{ display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Left: Calendar */}
          <div style={{ width: '58%', background: '#0a0d14', borderRight: '1px solid #1a1d2e', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Calendar filterMemberIds={calendarFilter} />
          </div>
          {/* Right: Tabs */}
          <div style={{ width: '42%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', flexShrink: 0, height: 40, background: '#0a0d14', borderBottom: '1px solid #1a1d2e' }}>
              {RIGHT_TABS.map(t => (
                <button key={t.id} onClick={() => setRightTab(t.id)} style={{
                  height: 40, padding: '0 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: rightTab === t.id ? 'rgba(59,130,246,0.06)' : 'transparent',
                  border: 'none',
                  color: rightTab === t.id ? '#fff' : '#6b7280',
                  borderBottom: rightTab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}>{t.label}</button>
              ))}
            </div>
            {/* Tab content */}
            <div ref={swipeRef} style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              {rightTab === 'today' && <TodayTab filterMemberIds={calendarFilter} />}
              {rightTab === 'smarthome' && <SmartHomePanel />}
              {rightTab === 'cameras' && <CamerasTab />}
              {rightTab === 'meals' && <MealPlanner />}
            </div>
          </div>
        </div>

        {/* FOOTER — grid row placeholder (actual footer is fixed) */}
        <div />
      </div>

      {/* Birthday banner */}
      <BirthdayBanner />

      {/* Morning briefing */}
      {showBriefing && <MorningBriefing onDismiss={() => setShowBriefing(false)} />}

      {/* Night dimmer overlay */}
      <NightDimmer />

      {/* Fixed announcement ticker */}
      <AnnouncementTicker />

      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onMembersUpdated={() => setAvatarRefreshKey(k => k + 1)}
        />
      )}
    </Screensaver>
  )
}
