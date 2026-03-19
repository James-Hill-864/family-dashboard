import { NextRequest, NextResponse } from 'next/server'
import { sendSMS } from '@/lib/twilio'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { memberId } = await req.json()
  const member = await prisma.familyMember.findUnique({ where: { id: memberId } })
  if (!member?.phoneNumber) return NextResponse.json({ error: 'No phone number' }, { status: 400 })
  await sendSMS(member.phoneNumber, `👋 Hi ${member.name}! Family Dashboard is set up correctly.`)
  return NextResponse.json({ ok: true })
}
