import { NextRequest, NextResponse } from 'next/server'

const HA_URL = process.env.HA_BASE_URL || 'http://homeassistant.local:8123'
const HA_TOKEN = process.env.HA_TOKEN || ''

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!HA_TOKEN) return NextResponse.json([])

  const entityId = req.nextUrl.searchParams.get('snapshot')

  // Proxy a camera snapshot
  if (entityId) {
    try {
      // Get entity-specific access token
      const stateRes = await fetch(`${HA_URL}/api/states/${entityId}`, {
        headers: { Authorization: `Bearer ${HA_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!stateRes.ok) return new NextResponse('Camera not found', { status: 404 })
      const state = await stateRes.json()
      const camToken = state.attributes?.access_token

      // Fetch snapshot using entity token (no auth header needed)
      const res = await fetch(`${HA_URL}/api/camera_proxy/${entityId}?token=${camToken}`, {
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const buffer = await res.arrayBuffer()
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
            'Cache-Control': 'no-cache, no-store',
          },
        })
      }
    } catch { /* fall through */ }
    return new NextResponse('Camera unavailable', { status: 502 })
  }

  // Return camera list with HA URL for direct iframe embedding
  try {
    const res = await fetch(`${HA_URL}/api/states`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json([])

    const states = await res.json()
    const cameras = states
      .filter((e: { entity_id: string }) => e.entity_id.startsWith('camera.'))
      .map((e: { entity_id: string; state: string; attributes: { friendly_name?: string; access_token?: string; entity_picture?: string } }) => ({
        entity_id: e.entity_id,
        name: e.attributes.friendly_name || e.entity_id,
        state: e.state,
        snapshotUrl: `/api/cameras?snapshot=${encodeURIComponent(e.entity_id)}`,
        haUrl: HA_URL,
        entityPicture: e.attributes.entity_picture,
      }))

    return NextResponse.json(cameras)
  } catch {
    return NextResponse.json([])
  }
}
