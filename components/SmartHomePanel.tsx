'use client'
import { useState, useEffect, useCallback } from 'react'

interface HADevice {
  entity_id: string
  state: string
  attributes: {
    friendly_name?: string
    volume_level?: number
    media_title?: string
    media_artist?: string
    app_name?: string
    supported_features?: number
    media_duration?: number
    media_position?: number
  }
}

interface HAStatus { connected: boolean; url: string; error?: string }

// supported_features bitmask
const SUPPORT_PLAY = 1
const SUPPORT_PAUSE = 2
const SUPPORT_STOP = 4096
const SUPPORT_VOLUME_SET = 4
const SUPPORT_NEXT = 32
const SUPPORT_PREV = 16

function supports(device: HADevice, flag: number) {
  return ((device.attributes.supported_features ?? 0) & flag) !== 0
}

function StateLabel({ state, haConnected }: { state: string; haConnected: boolean }) {
  const displayState = (state === 'unavailable' && haConnected) ? 'standby' : state
  const labels: Record<string, { text: string; color: string }> = {
    playing: { text: '▶ Playing', color: '#10b981' },
    paused:  { text: '⏸ Paused',  color: '#f59e0b' },
    idle:    { text: '○ Idle',    color: '#5a5a80' },
    off:     { text: '○ Off',     color: '#3a3a58' },
    standby: { text: '○ Standby', color: '#4a4a68' },
    unavailable: { text: '✕ Unavailable', color: '#ef4444' },
  }
  const l = labels[displayState] || { text: displayState, color: '#5a5a80' }
  return <span style={{ fontSize: '11px', color: l.color, fontWeight: 600, textTransform: 'capitalize' }}>{l.text}</span>
}

function DeviceCard({ device, haConnected, onAction }: { device: HADevice; haConnected: boolean; onAction: (domain: string, service: string, data: object) => void }) {
  const name = device.attributes.friendly_name || device.entity_id
  const effectiveState = (device.state === 'unavailable' && haConnected) ? 'standby' : device.state
  const isOn = effectiveState !== 'off' && effectiveState !== 'unavailable' && effectiveState !== 'standby'
  const isUnavailable = effectiveState === 'unavailable'
  const isPlaying = device.state === 'playing'
  const volume = device.attributes.volume_level ?? null
  const mediaTitle = device.attributes.media_title
  const artist = device.attributes.media_artist
  const eid = device.entity_id

  const act = (service: string, extra?: object) =>
    onAction('media_player', service, { entity_id: eid, ...extra })

  return (
    <div
      className="rounded-2xl p-3 flex flex-col gap-2.5"
      style={{
        background: isPlaying ? 'rgba(16,185,129,0.07)' : isOn ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isPlaying ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
        opacity: isUnavailable ? 0.35 : 1,
      }}
    >
      {/* Top row: icon + info + power toggle */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: '38px', height: '38px', fontSize: '20px', background: isPlaying ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)' }}
        >
          {isPlaying ? '🔊' : isOn ? '📻' : '🔇'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold truncate" style={{ fontSize: '13px' }}>{name}</div>
          {mediaTitle ? (
            <div style={{ fontSize: '11px', color: 'var(--text-2)' }} className="truncate">
              {artist ? `${artist} — ` : ''}{mediaTitle}
            </div>
          ) : (
            <StateLabel state={effectiveState} haConnected={haConnected} />
          )}
        </div>
        {/* Power toggle */}
        <button
          onClick={() => act(isOn ? 'turn_off' : 'turn_on')}
          disabled={isUnavailable}
          className="flex-shrink-0 flex items-center rounded-full transition-all"
          style={{ width: '44px', height: '24px', padding: '2px', background: isOn ? '#10b981' : 'rgba(255,255,255,0.08)' }}
        >
          <div className="rounded-full bg-white transition-transform" style={{ width: '20px', height: '20px', transform: isOn ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
      </div>

      {/* Playback controls */}
      {isOn && (supports(device, SUPPORT_PREV) || supports(device, SUPPORT_PLAY) || supports(device, SUPPORT_PAUSE) || supports(device, SUPPORT_NEXT) || supports(device, SUPPORT_STOP)) && (
        <div className="flex items-center justify-center gap-1">
          {supports(device, SUPPORT_PREV) && (
            <button onClick={() => act('media_previous_track')}
              className="flex items-center justify-center rounded-xl"
              style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.06)', fontSize: '16px' }}>⏮</button>
          )}
          {(supports(device, SUPPORT_PLAY) || supports(device, SUPPORT_PAUSE)) && (
            <button
              onClick={() => act(isPlaying ? 'media_pause' : 'media_play')}
              className="flex items-center justify-center rounded-xl text-white font-bold"
              style={{ width: '44px', height: '44px', background: isPlaying ? '#f59e0b' : '#10b981', fontSize: '18px' }}
            >{isPlaying ? '⏸' : '▶'}</button>
          )}
          {supports(device, SUPPORT_STOP) && (
            <button onClick={() => act('media_stop')}
              className="flex items-center justify-center rounded-xl"
              style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.06)', fontSize: '16px' }}>⏹</button>
          )}
          {supports(device, SUPPORT_NEXT) && (
            <button onClick={() => act('media_next_track')}
              className="flex items-center justify-center rounded-xl"
              style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.06)', fontSize: '16px' }}>⏭</button>
          )}
        </div>
      )}

      {/* Volume slider */}
      {isOn && volume !== null && supports(device, SUPPORT_VOLUME_SET) && (
        <div className="flex items-center gap-2">
          <button onClick={() => act('volume_mute', { is_volume_muted: true })}
            style={{ fontSize: '14px', color: 'var(--text-3)', background: 'transparent' }}>🔈</button>
          <input
            type="range" min={0} max={1} step={0.05} value={volume}
            onChange={e => act('volume_set', { volume_level: parseFloat(e.target.value) })}
            className="flex-1"
          />
          <span style={{ fontSize: '11px', color: 'var(--text-2)', minWidth: '30px', textAlign: 'right' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

export default function SmartHomePanel() {
  const [devices, setDevices] = useState<HADevice[]>([])
  const [status, setStatus] = useState<HAStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const [statusRes, devicesRes] = await Promise.allSettled([
      fetch('/api/ha/status').then(r => r.json()),
      fetch('/api/ha/states').then(r => r.ok ? r.json() : []),
    ])
    if (statusRes.status === 'fulfilled') setStatus(statusRes.value)
    if (devicesRes.status === 'fulfilled' && Array.isArray(devicesRes.value)) {
      const devs = devicesRes.value as HADevice[]
      console.log('[SmartHome] Entity IDs found:', devs.map(d => `${d.entity_id} (${d.state})`))
      setDevices(devs)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
    const iv = setInterval(loadAll, 20000)
    return () => clearInterval(iv)
  }, [loadAll])

  const handleAction = async (domain: string, service: string, data: object) => {
    await fetch('/api/ha/service', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, service, data }),
    })
    setTimeout(loadAll, 800)
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Smart Home</div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="text-white font-bold" style={{ fontSize: '15px' }}>Media Players</div>
            {status && (
              <div className="flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ background: status.connected ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${status.connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                <div className="rounded-full" style={{ width: '6px', height: '6px', background: status.connected ? '#10b981' : '#ef4444' }} />
                <span style={{ fontSize: '10px', color: status.connected ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {status.connected ? 'HA Connected' : 'HA Offline'}
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center justify-center rounded-xl"
          style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', fontSize: '18px' }}
        >↻</button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 flex-1 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="rounded-2xl" style={{ height: '80px', background: 'rgba(255,255,255,0.03)' }} />)}
        </div>
      ) : devices.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div style={{ fontSize: '2.5rem' }}>🏠</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6 }}>
            {status?.connected ? 'No media players found' : <>HA offline<br /><span style={{ fontSize: '11px' }}>{status?.url}</span></>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {devices.map(device => (
            <DeviceCard key={device.entity_id} device={device} haConnected={status?.connected ?? false} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  )
}
