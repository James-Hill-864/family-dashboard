import { NextResponse } from 'next/server'
import { getStates } from '@/lib/ha'

export async function GET() {
  try {
    const states = await getStates()
    // Return ALL media_player entities (not just cast-filtered), skip groups
    const devices = states.filter(s => {
      if (!s.entity_id.startsWith('media_player.')) return false
      // Skip group entities
      if (s.attributes['entity_id'] && Array.isArray(s.attributes['entity_id'])) return false
      return true
    })
    console.log('[ha/states] media_player entities:', devices.map(d => `${d.entity_id}=${d.state}`))
    return NextResponse.json(devices)
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to fetch HA states', detail: String(e) },
      { status: 500 }
    )
  }
}
