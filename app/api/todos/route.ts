import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const todos = await prisma.todo.findMany({
    where: { ...(category ? { category } : {}) },
    include: { assignee: true },
    orderBy: [{ done: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(todos)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const todo = await prisma.todo.create({ data: body, include: { assignee: true } })
  broadcastUpdate('todos')
  return NextResponse.json(todo, { status: 201 })
}
