import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function GET() {
  const items = await prisma.groceryItem.findMany({ orderBy: [{ category: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const item = await prisma.groceryItem.create({ data: body })
  broadcastUpdate('grocery')
  return NextResponse.json(item, { status: 201 })
}

export async function DELETE() {
  // Clear checked items
  await prisma.groceryItem.deleteMany({ where: { checked: true } })
  broadcastUpdate('grocery')
  return NextResponse.json({ ok: true })
}
