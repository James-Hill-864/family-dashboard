import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcStartOfToday, todayDateString } from '@/lib/dates'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Use UTC midnight so Google all-day events (stored as UTC midnight) are included
  const start = utcStartOfToday()
  const future = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000)

  const events = await prisma.calendarEvent.findMany({
    where: {
      startTime: { gte: start, lte: future },
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

  const todayStr = todayDateString()
  const countdowns = events.map(e => {
    // Extract UTC date portion for display (no timezone ambiguity)
    const dateOnly = e.startTime.toISOString().split('T')[0]
    // Calculate days remaining using date strings to avoid timezone math
    const eventDays = Math.floor(new Date(dateOnly + 'T12:00:00Z').getTime() / 86400000)
    const todayDays = Math.floor(new Date(todayStr + 'T12:00:00Z').getTime() / 86400000)
    const daysRemaining = eventDays - todayDays
    return {
      id: e.id,
      title: e.title,
      date: dateOnly,
      daysRemaining: Math.max(0, daysRemaining),
      type: e.type,
      memberName: e.member.name,
      color: e.color || e.member.color,
    }
  })

  return NextResponse.json(countdowns)
}
