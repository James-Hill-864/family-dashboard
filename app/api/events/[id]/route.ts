import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { reminders: _reminders, ...body } = await req.json()
  const event = await prisma.calendarEvent.update({
    where: { id: params.id },
    data: body,
    include: { member: true, reminders: true },
  })
  broadcastUpdate('events')
  return NextResponse.json(event)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.calendarEvent.delete({ where: { id: params.id } })
  broadcastUpdate('events')
  return new NextResponse(null, { status: 204 })
}
