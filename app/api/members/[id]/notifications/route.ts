import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { notificationPrefs, email, agendaEmailEnabled, agendaEmailTime, eventReminderMinutes } = await req.json()
  const data: Record<string, unknown> = {
    notificationPrefs: JSON.stringify(notificationPrefs),
    email: email || null,
    agendaEmailEnabled: agendaEmailEnabled ?? true,
  }
  if (agendaEmailTime !== undefined) data.agendaEmailTime = agendaEmailTime
  if (eventReminderMinutes !== undefined) data.eventReminderMinutes = eventReminderMinutes
  const member = await prisma.familyMember.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(member)
}
