const HA_BASE = process.env.HA_BASE_URL || 'http://homeassistant.local:8123'
const HA_TOKEN = process.env.HA_TOKEN || ''

export interface HAState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_updated: string
}

export interface HAStatus {
  connected: boolean
  url: string
  error?: string
}

async function haFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${HA_BASE}/api${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HA_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HA API ${path} error: ${res.status} ${res.statusText}`)
  return res.json()
}

export async function checkStatus(): Promise<HAStatus> {
  try {
    const data = await haFetch('/') as { message?: string }
    return { connected: data?.message === 'API running.', url: HA_BASE }
  } catch (e) {
    return { connected: false, url: HA_BASE, error: String(e) }
  }
}

export async function getStates(): Promise<HAState[]> {
  return haFetch('/states') as Promise<HAState[]>
}

export async function getState(entityId: string): Promise<HAState> {
  return haFetch(`/states/${entityId}`) as Promise<HAState>
}

export async function callService(domain: string, service: string, data: Record<string, unknown>): Promise<unknown> {
  return haFetch(`/services/${domain}/${service}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getAllMediaPlayers(states: HAState[]): HAState[] {
  return states.filter(s => s.entity_id.startsWith('media_player.'))
}

export function isCastDevice(state: HAState): boolean {
  return (
    state.entity_id.startsWith('media_player.') &&
    (state.attributes['device_class'] === 'tv' ||
      (!!state.attributes['supported_features'] && state.attributes['platform'] === 'cast') ||
      state.entity_id.includes('cast') ||
      state.entity_id.includes('tv') ||
      state.entity_id.includes('speaker') ||
      state.entity_id.includes('google') ||
      state.entity_id.includes('chromecast'))
  )
}

export function getCastDevices(states: HAState[]): HAState[] {
  // These are known group/aggregate entities to skip
  const SKIP_ENTITIES = ['media_player.home_group', 'media_player.speakers', 'media_player.hisense_tv_2']

  return states
    .filter(s => {
      if (!s.entity_id.startsWith('media_player.')) return false
      if (SKIP_ENTITIES.includes(s.entity_id)) return false
      // Skip if it's a group (has entity_id_list attribute)
      if (s.attributes['entity_id'] && Array.isArray(s.attributes['entity_id'])) return false
      return true
    })
    .map(s => {
      // Fix friendly names
      const nameMap: Record<string, string> = {
        'media_player.viziosoundbar': 'VIZIO SoundBar',
        'media_player.master_mini': 'Master Mini',
        'media_player.boy_s_room': "Boy's Room TV",
        'media_player.hisense_tv': 'Hisense TV',
        'media_player.living_room_mini': 'Living Room Mini',
      }
      if (nameMap[s.entity_id]) {
        return { ...s, attributes: { ...s.attributes, friendly_name: nameMap[s.entity_id] } }
      }
      return s
    })
}
