import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function GET() {
  const notes = await prisma.note.findMany({
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const note = await prisma.note.create({ data: body })
  broadcastUpdate('notes')
  return NextResponse.json(note, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json()
  const note = await prisma.note.update({ where: { id }, data })
  broadcastUpdate('notes')
  return NextResponse.json(note)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.note.delete({ where: { id } })
  broadcastUpdate('notes')
  return new NextResponse(null, { status: 204 })
}
