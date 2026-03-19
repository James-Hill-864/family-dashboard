import { NextResponse } from 'next/server'
import { listCameras } from '@/lib/nestCameras'

export async function GET(req: Request) {
  const token = req.headers.get('x-nest-token') || ''
  if (!token) return NextResponse.json({ cameras: [], error: 'No token' })
  const cameras = await listCameras(token)
  return NextResponse.json({ cameras })
}
