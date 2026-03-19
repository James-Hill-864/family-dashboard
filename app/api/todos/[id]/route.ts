import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const todo = await prisma.todo.update({
    where: { id: params.id },
    data: { ...body, ...(body.done ? { doneAt: new Date() } : { doneAt: null }) },
    include: { assignee: true },
  })
  broadcastUpdate('todos')
  return NextResponse.json(todo)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.todo.delete({ where: { id: params.id } })
  broadcastUpdate('todos')
  return new NextResponse(null, { status: 204 })
}
