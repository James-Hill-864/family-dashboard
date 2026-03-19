import { NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/weather'

export async function GET() {
  try {
    const data = await fetchWeather()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 })
  }
}
