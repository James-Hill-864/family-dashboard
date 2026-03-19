import { NextResponse } from 'next/server'

const NWS_URL = 'https://api.weather.gov/alerts/active?point=34.9176,-82.2946'
interface WeatherAlert {
  id: string; title: string; description: string; severity: string
  urgency: string; effective?: string; expires?: string
}
const cache: { data: WeatherAlert[]; time: number } = { data: [], time: 0 }
const CACHE_TTL = 10 * 60 * 1000

export async function GET() {
  const now = Date.now()
  if (now - cache.time < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }
  try {
    const res = await fetch(NWS_URL, { headers: { 'User-Agent': 'FamilyDashboard/1.0' } })
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    interface NWSFeature {
      id: string
      properties?: {
        event?: string; description?: string; severity?: string
        urgency?: string; effective?: string; expires?: string
      }
    }
    const alerts = (data?.features || []).map((f: NWSFeature) => ({
      id: f.id,
      title: f.properties?.event || 'Alert',
      description: f.properties?.description || '',
      severity: f.properties?.severity || 'Unknown',
      urgency: f.properties?.urgency || 'Unknown',
      effective: f.properties?.effective,
      expires: f.properties?.expires,
    }))
    cache.data = alerts
    cache.time = now
    return NextResponse.json(alerts)
  } catch {
    return NextResponse.json([])
  }
}
