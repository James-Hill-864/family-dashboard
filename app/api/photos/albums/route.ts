import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { refreshAccessToken, getPhotoAlbums } from '@/lib/google'

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

    const albums = await getPhotoAlbums(token)
    return NextResponse.json(albums)
  } catch (err) {
    console.error('[photos/albums] error:', err instanceof Error ? err.message : err)
    return NextResponse.json([])
  }
}
