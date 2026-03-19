import { NextRequest, NextResponse } from 'next/server'
import { callService } from '@/lib/ha'

export async function POST(req: NextRequest) {
  try {
    const { domain, service, data } = await req.json()
    const result = await callService(domain, service, data)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to call service' }, { status: 500 })
  }
}
