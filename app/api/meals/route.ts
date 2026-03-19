import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('weekStart')
  const meals = await prisma.mealPlan.findMany({
    where: weekStart ? { weekStart: new Date(weekStart) } : {},
    include: { assignments: { include: { member: true } } },
    orderBy: [{ day: 'asc' }, { mealType: 'asc' }],
  })
  return NextResponse.json(meals)
}

export async function POST(req: NextRequest) {
  const { assignments, ...body } = await req.json()
  const meal = await prisma.mealPlan.create({
    data: {
      ...body,
      weekStart: new Date(body.weekStart),
      assignments: assignments ? { create: assignments } : undefined,
    },
    include: { assignments: { include: { member: true } } },
  })
  broadcastUpdate('meals')
  return NextResponse.json(meal, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json()
  const meal = await prisma.mealPlan.update({
    where: { id },
    data,
  })
  broadcastUpdate('meals')
  return NextResponse.json(meal)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.mealPlan.delete({ where: { id } })
  broadcastUpdate('meals')
  return new NextResponse(null, { status: 204 })
}
