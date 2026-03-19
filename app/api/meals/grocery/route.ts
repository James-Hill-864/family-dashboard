import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function POST(req: NextRequest) {
  const { weekStart } = await req.json() as { weekStart: string }
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

  const meals = await prisma.mealPlan.findMany({
    where: { weekStart: new Date(weekStart) },
  })

  const matched: string[] = []
  const unmatched: string[] = []
  const allIngredients: Array<{ name: string; amount: string; unit: string; recipeId: string }> = []

  for (const meal of meals) {
    if (!meal.name) continue
    // Find recipe matching meal name (case-insensitive)
    const recipe = await prisma.recipe.findFirst({
      where: { title: { equals: meal.name } },
    })
    if (recipe) {
      matched.push(meal.name)
      const ingredients: Array<{ amount?: string; unit?: string; name: string }> = JSON.parse(recipe.ingredients || '[]')
      for (const ing of ingredients) {
        allIngredients.push({
          name: ing.name.trim(),
          amount: ing.amount || '',
          unit: ing.unit || '',
          recipeId: recipe.id,
        })
      }
    } else {
      if (!unmatched.includes(meal.name)) unmatched.push(meal.name)
    }
  }

  // Deduplicate by name+unit (case-insensitive)
  const deduped = new Map<string, { name: string; amount: number; unit: string; recipeId: string }>()
  for (const ing of allIngredients) {
    const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`
    const existing = deduped.get(key)
    const qty = parseFloat(ing.amount) || 0
    if (existing) {
      existing.amount += qty
    } else {
      deduped.set(key, { name: ing.name, amount: qty, unit: ing.unit, recipeId: ing.recipeId })
    }
  }

  let added = 0
  for (const item of Array.from(deduped.values())) {
    // Check if already in grocery list
    const existing = await prisma.groceryItem.findFirst({
      where: { checked: false, name: { equals: item.name.toLowerCase() } },
    })
    if (!existing) {
      await prisma.groceryItem.create({
        data: {
          name: item.name,
          quantity: item.amount > 0 ? String(item.amount) : null,
          unit: item.unit || null,
          category: 'Recipe',
          recipeId: item.recipeId,
        },
      })
      added++
    }
  }

  broadcastUpdate('grocery')
  return NextResponse.json({
    added,
    matched: matched.length,
    unmatched,
  })
}
