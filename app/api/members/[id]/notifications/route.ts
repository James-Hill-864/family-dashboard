import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { phoneNumber, notificationPrefs, email, agendaEmailEnabled } = await req.json()
  const member = await prisma.familyMember.update({
    where: { id: params.id },
    data: {
      phoneNumber: phoneNumber || null,
      notificationPrefs: JSON.stringify(notificationPrefs),
      email: email || null,
      agendaEmailEnabled: agendaEmailEnabled ?? true,
    },
  })
  return NextResponse.json(member)
}
