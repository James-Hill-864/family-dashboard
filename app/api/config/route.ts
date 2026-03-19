import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    familyName: process.env.NEXT_PUBLIC_FAMILY_NAME || process.env.FAMILY_NAME || 'Our Family',
    haBaseUrl: process.env.HA_BASE_URL || '',
    googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  })
}
