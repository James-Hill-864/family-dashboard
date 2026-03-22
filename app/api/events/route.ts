import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'
import { sendNewEventNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  let where = {}
  if (start && end) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    // For all-day events (stored as UTC midnight by Google), extend bounds
    // to UTC midnight of the start/end dates so they aren't excluded
    const utcStart = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()))
    const utcEnd = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1))
    where = {
      OR: [
        // Timed events: use the original local time range
        { allDay: false, startTime: { gte: startDate }, endTime: { lte: endDate } },
        // All-day events: use UTC midnight boundaries for the full range
        { allDay: true, startTime: { gte: utcStart, lt: utcEnd } },
      ],
    }
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    include: { member: true, reminders: true },
    orderBy: { startTime: 'asc' },
  })
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { reminders, ...eventData } = body
  const event = await prisma.calendarEvent.create({
    data: {
      ...eventData,
      reminders: reminders ? { create: reminders } : undefined,
    },
    include: { member: true, reminders: true },
  })
  broadcastUpdate('events')
  // Send email notification for new events
  try {
    await sendNewEventNotification({ title: event.title, startTime: event.startTime }, event.memberId)
  } catch (err) {
    console.error('[events] notification error:', err)
  }
  return NextResponse.json(event, { status: 201 })
}
