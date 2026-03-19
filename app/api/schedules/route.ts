import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const schedules = await prisma.schedule.findMany({
    include: { member: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
  return NextResponse.json(schedules)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const schedule = await prisma.schedule.create({
    data: body,
    include: { member: true },
  })
  return NextResponse.json(schedule, { status: 201 })
}
