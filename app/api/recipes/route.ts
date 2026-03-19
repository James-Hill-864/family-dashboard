import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const favorite = searchParams.get('favorite')

  const recipes = await prisma.recipe.findMany({
    where: {
      ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
      ...(category ? { category } : {}),
      ...(favorite === 'true' ? { favorite: true } : {}),
    },
    include: { addedBy: { select: { id: true, name: true, color: true, emoji: true } } },
    orderBy: [{ favorite: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(recipes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const recipe = await prisma.recipe.create({
    data: {
      title: body.title,
      description: body.description || null,
      ingredients: JSON.stringify(body.ingredients || []),
      instructions: JSON.stringify(body.instructions || []),
      prepTime: body.prepTime ? Number(body.prepTime) : null,
      cookTime: body.cookTime ? Number(body.cookTime) : null,
      servings: body.servings ? Number(body.servings) : null,
      category: body.category || 'dinner',
      imageUrl: body.imageUrl || null,
      sourceUrl: body.sourceUrl || null,
      favorite: body.favorite || false,
      tags: body.tags ? JSON.stringify(body.tags) : null,
      addedById: body.addedById || null,
    },
    include: { addedBy: { select: { id: true, name: true, color: true, emoji: true } } },
  })
  return NextResponse.json(recipe, { status: 201 })
}
