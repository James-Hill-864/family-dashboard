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
  }
}

interface HAStatus { connected: boolean; url: string; error?: string }

const SUPPORT_PLAY = 1
const SUPPORT_PAUSE = 2
const SUPPORT_STOP = 4096
const SUPPORT_VOLUME_SET = 4
const SUPPORT_NEXT = 32
const SUPPORT_PREV = 16

function supports(device: HADevice, flag: number) {
  return ((device.attributes.supported_features ?? 0) & flag) !== 0
}

// Skip groups and duplicates
const SKIP = ['media_player.home_group', 'media_player.speakers', 'media_player.hisense_tv_2']

// Device metadata: icon, room, display name
const DEVICE_META: Record<string, { icon: string; room: string; name: string }> = {
  'media_player.master_mini': { icon: '🔊', room: 'Master Bedroom', name: 'Nest Mini' },
  'media_player.master_tv': { icon: '📺', room: 'Master Bedroom', name: 'TV' },
  'media_player.hisense_tv': { icon: '📺', room: 'Living Room', name: 'Hisense TV' },
  'media_player.living_room_mini': { icon: '🔊', room: 'Living Room', name: 'Nest Mini' },
  'media_player.viziosoundbar': { icon: '🔉', room: 'Living Room', name: 'Sound Bar' },
  'media_player.boy_s_room': { icon: '📺', room: "Boy's Room", name: 'TV' },
  'media_player.pop_s_xbox': { icon: '🎮', room: 'Office', name: 'Xbox' },
}

function getDeviceMeta(device: HADevice) {
  const meta = DEVICE_META[device.entity_id]
  if (meta) return meta
  const name = device.attributes.friendly_name || device.entity_id.replace('media_player.', '')
  const eid = device.entity_id.toLowerCase()
  const icon = eid.includes('tv') ? '📺' : eid.includes('xbox') ? '🎮' : eid.includes('sound') ? '🔉' : '🔊'
  return { icon, room: 'Other', name }
}

function DeviceCard({ device, haConnected, onAction }: { device: HADevice; haConnected: boolean; onAction: (domain: string, service: string, data: object) => void }) {
  const meta = getDeviceMeta(device)
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

  const stateColor = isPlaying ? '#10b981' : isOn ? '#3b82f6' : '#3a3a58'
  const stateText = isPlaying ? 'Playing' : effectiveState === 'paused' ? 'Paused' : isOn ? 'On' : effectiveState

  return (
    <div style={{
      borderRadius: 12, padding: '10px 12px',
      background: isPlaying ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isPlaying ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
      opacity: isUnavailable ? 0.3 : 1,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: isPlaying ? 'rgba(16,185,129,0.15)' : isOn ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{meta.name}</div>
          {mediaTitle ? (
            <div style={{ fontSize: 10, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {artist ? `${artist} — ` : ''}{mediaTitle}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: stateColor, fontWeight: 600, textTransform: 'capitalize' }}>{stateText}</div>
          )}
        </div>
        <button
          onClick={() => act(isOn ? 'turn_off' : 'turn_on')}
          disabled={isUnavailable}
          style={{
            width: 40, height: 22, padding: 2, borderRadius: 11, border: 'none', cursor: isUnavailable ? 'default' : 'pointer',
            background: isOn ? '#10b981' : 'rgba(255,255,255,0.08)', flexShrink: 0,
            display: 'flex', alignItems: 'center',
          }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', transform: isOn ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.15s' }} />
        </button>
      </div>

      {/* Playback + Volume */}
      {isOn && (supports(device, SUPPORT_PLAY) || supports(device, SUPPORT_PAUSE) || supports(device, SUPPORT_VOLUME_SET)) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(supports(device, SUPPORT_PLAY) || supports(device, SUPPORT_PAUSE)) && (
            <>
              {supports(device, SUPPORT_PREV) && (
                <button onClick={() => act('media_previous_track')}
                  style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏮</button>
              )}
              <button onClick={() => act(isPlaying ? 'media_pause' : 'media_play')}
                style={{ width: 32, height: 32, borderRadius: 8, background: isPlaying ? '#f59e0b' : '#10b981', border: 'none', cursor: 'pointer', fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              {supports(device, SUPPORT_STOP) && (
                <button onClick={() => act('media_stop')}
                  style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏹</button>
              )}
              {supports(device, SUPPORT_NEXT) && (
                <button onClick={() => act('media_next_track')}
                  style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏭</button>
              )}
            </>
          )}
          {volume !== null && supports(device, SUPPORT_VOLUME_SET) && (
            <>
              <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />
              <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>🔈</span>
              <input type="range" min={0} max={1} step={0.05} value={volume}
                onChange={e => act('volume_set', { volume_level: parseFloat(e.target.value) })}
                style={{ flex: 1, height: 4 }} />
              <span style={{ fontSize: 10, color: '#6b7280', minWidth: 28, textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
            </>
          )}
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
      setDevices(devicesRes.value.filter((d: HADevice) => !SKIP.includes(d.entity_id)))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
    const iv = setInterval(loadAll, 15000)
    return () => clearInterval(iv)
  }, [loadAll])

  const handleAction = async (domain: string, service: string, data: object) => {
    await fetch('/api/ha/service', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, service, data }),
    })
    setTimeout(loadAll, 800)
  }

  // Group by room
  const rooms = new Map<string, HADevice[]>()
  for (const d of devices) {
    const room = getDeviceMeta(d).room
    if (!rooms.has(room)) rooms.set(room, [])
    rooms.get(room)!.push(d)
  }
  // Sort: rooms with active devices first
  const sortedRooms = Array.from(rooms.entries()).sort(([, a], [, b]) => {
    const aActive = a.some(d => d.state === 'playing' || d.state === 'on')
    const bActive = b.some(d => d.state === 'playing' || d.state === 'on')
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1
    return 0
  })

  return (
    <div className="h-full flex flex-col" style={{ padding: '12px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, color: '#4a4d6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Smart Home</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Devices</span>
            {status && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 10,
                background: status.connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: status.connected ? '#10b981' : '#ef4444' }} />
                <span style={{ fontSize: 9, color: status.connected ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {status.connected ? 'Connected' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>
        <button onClick={loadAll}
          style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: 'none', color: '#6b7280', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ↻
        </button>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 60, borderRadius: 12, background: 'rgba(255,255,255,0.03)' }} />)}
        </div>
      ) : devices.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 28 }}>🏠</span>
          <span style={{ fontSize: 12, color: '#4a4d6a' }}>{status?.connected ? 'No devices found' : 'HA Offline'}</span>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sortedRooms.map(([room, roomDevices]) => (
            <div key={room}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, paddingLeft: 2 }}>
                {room}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {roomDevices.map(device => (
                  <DeviceCard key={device.entity_id} device={device} haConnected={status?.connected ?? false} onAction={handleAction} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
