import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const item = await prisma.groceryItem.update({ where: { id: params.id }, data: body })
  broadcastUpdate('grocery')
  return NextResponse.json(item)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.groceryItem.delete({ where: { id: params.id } })
  broadcastUpdate('grocery')
  return new NextResponse(null, { status: 204 })
}
