import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { refreshAccessToken, getPhotos } from '@/lib/google'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('albumId') || undefined

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

    const photos = await getPhotos(token, folderId, 50)
    return NextResponse.json(photos.map(p => ({
      id: p.id,
      url: p.baseUrl,
      name: p.name,
    })))
  } catch {
    return NextResponse.json([])
  }
}
