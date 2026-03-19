import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const members = await prisma.familyMember.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
  return NextResponse.json(members)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Set sortOrder to max + 1 so new members appear at the end
  const max = await prisma.familyMember.aggregate({ _max: { sortOrder: true } })
  body.sortOrder = (max._max.sortOrder ?? -1) + 1
  const member = await prisma.familyMember.create({ data: body })
  return NextResponse.json(member, { status: 201 })
}
