import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  const events = await prisma.calendarEvent.findMany({
    where: {
      ...(start && end ? {
        startTime: { gte: new Date(start) },
        endTime: { lte: new Date(end) },
      } : {}),
    },
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
  return NextResponse.json(event, { status: 201 })
}
