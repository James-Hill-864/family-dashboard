import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: { addedBy: { select: { id: true, name: true, color: true, emoji: true } } },
  })
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(recipe)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const recipe = await prisma.recipe.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.ingredients !== undefined && { ingredients: JSON.stringify(body.ingredients) }),
      ...(body.instructions !== undefined && { instructions: JSON.stringify(body.instructions) }),
      ...(body.prepTime !== undefined && { prepTime: body.prepTime ? Number(body.prepTime) : null }),
      ...(body.cookTime !== undefined && { cookTime: body.cookTime ? Number(body.cookTime) : null }),
      ...(body.servings !== undefined && { servings: body.servings ? Number(body.servings) : null }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.sourceUrl !== undefined && { sourceUrl: body.sourceUrl }),
      ...(body.favorite !== undefined && { favorite: body.favorite }),
      ...(body.tags !== undefined && { tags: JSON.stringify(body.tags) }),
    },
    include: { addedBy: { select: { id: true, name: true, color: true, emoji: true } } },
  })
  return NextResponse.json(recipe)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.recipe.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
