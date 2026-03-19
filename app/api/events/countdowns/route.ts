import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date()
  const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const events = await prisma.calendarEvent.findMany({
    where: {
      startTime: { gte: now, lte: future },
      OR: [
        { type: { in: ['birthday', 'vacation', 'countdown'] } },
        { title: { contains: 'birthday' } },
        { title: { contains: 'Birthday' } },
        { title: { contains: 'vacation' } },
        { title: { contains: 'Vacation' } },
      ],
    },
    include: { member: true },
    orderBy: { startTime: 'asc' },
    take: 5,
  })

  const countdowns = events.map(e => {
    // For all-day events stored as UTC midnight, extract just the date part
    // to avoid timezone offset issues on the client
    const iso = e.startTime.toISOString()
    const dateOnly = iso.split('T')[0] // "2026-03-20"
    const eventDate = new Date(dateOnly + 'T12:00:00') // noon local to avoid day boundary issues
    const todayNoon = new Date()
    todayNoon.setHours(12, 0, 0, 0)
    const days = Math.round((eventDate.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24))
    return {
      id: e.id,
      title: e.title,
      date: dateOnly, // "2026-03-20" — no timezone ambiguity
      daysRemaining: Math.max(0, days),
      type: e.type,
      memberName: e.member.name,
      color: e.color || e.member.color,
    }
  })

  return NextResponse.json(countdowns)
}
