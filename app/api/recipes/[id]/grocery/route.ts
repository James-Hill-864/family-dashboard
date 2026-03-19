import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const recipe = await prisma.recipe.findUnique({ where: { id: params.id } })
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { addedBy?: string }
  const ingredients: Array<{ amount?: string; unit?: string; name: string }> = JSON.parse(recipe.ingredients || '[]')

  let added = 0
  for (const ing of ingredients) {
    const nameLower = ing.name.trim().toLowerCase()
    // Check for existing unchecked item with same name
    const existing = await prisma.groceryItem.findFirst({
      where: { checked: false, name: { equals: nameLower } },
    })

    if (existing && existing.unit === (ing.unit || null)) {
      // Same unit — try to merge quantities
      const existQty = parseFloat(existing.quantity || '0')
      const newQty = parseFloat(ing.amount || '0')
      if (!isNaN(existQty) && !isNaN(newQty) && (existQty > 0 || newQty > 0)) {
        await prisma.groceryItem.update({
          where: { id: existing.id },
          data: { quantity: String(existQty + newQty) },
        })
      }
      // If quantities can't be parsed, just skip (item already exists)
    } else {
      await prisma.groceryItem.create({
        data: {
          name: ing.name.trim(),
          quantity: ing.amount || null,
          unit: ing.unit || null,
          category: 'Recipe',
          addedBy: body.addedBy || null,
          recipeId: params.id,
        },
      })
      added++
    }
  }

  broadcastUpdate('grocery')
  return NextResponse.json({ added })
}
