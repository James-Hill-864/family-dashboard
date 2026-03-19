import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''

  if (!q) return NextResponse.json([])

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { type: { contains: q } },
        { member: { name: { contains: q } } },
      ],
    },
    include: { member: { select: { id: true, name: true, color: true, emoji: true } } },
    orderBy: { startTime: 'asc' },
    take: 50,
  })

  // Sort: upcoming first, then past
  const now = new Date()
  const upcoming = events.filter(e => e.startTime >= now)
  const past = events.filter(e => e.startTime < now).reverse()
  return NextResponse.json([...upcoming, ...past])
}
