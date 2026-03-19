import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAnnouncement } from '@/lib/notifications'

export async function GET() {
  const now = new Date()
  const items = await prisma.announcement.findMany({
    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { notifySms, ...data } = body
  const item = await prisma.announcement.create({ data })
  if (notifySms) {
    const creator = await prisma.familyMember.findUnique({ where: { id: data.createdBy } })
    await sendAnnouncement(data.message, creator?.name || 'Family')
  }
  return NextResponse.json(item, { status: 201 })
}
