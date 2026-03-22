import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { refreshAccessToken, getOnThisDayPhotos } from '@/lib/google'

export const dynamic = 'force-dynamic'

export async function GET() {
  const member = await prisma.familyMember.findFirst({
    where: { googleRefreshToken: { not: null } },
    orderBy: { name: 'asc' },
  })

  if (!member?.googleRefreshToken) return NextResponse.json([])

  try {
    let token = member.googleAccessToken!
    if (!member.googleTokenExpiry || member.googleTokenExpiry < new Date(Date.now() + 60_000)) {
      const r = await refreshAccessToken(member.googleRefreshToken)
      token = r.access_token
      await prisma.familyMember.update({
        where: { id: member.id },
        data: { googleAccessToken: r.access_token, googleTokenExpiry: new Date(r.expiry_date) },
      })
    }

    const now = new Date()
    const photos = await getOnThisDayPhotos(token, now.getMonth() + 1, now.getDate())
    const currentYear = now.getFullYear()

    return NextResponse.json(photos.map(p => ({
      id: p.id,
      url: p.baseUrl,
      name: p.name,
      year: p.year,
      yearsAgo: p.year > 0 ? currentYear - p.year : 0,
    })))
  } catch (err) {
    console.error('[photos/onthisday] Error:', err)
    return NextResponse.json([])
  }
}
