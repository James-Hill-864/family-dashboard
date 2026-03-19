import { NextRequest, NextResponse } from 'next/server'

const INGREDIENT_RE = /^([\d\/\s.¼½¾⅓⅔⅛]+)?\s*(cups?|tbsps?|tsps?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|L|pinch|cloves?|cans?|packages?|pkg|bunch|bunches|stalks?|slices?|pieces?|whole|large|medium|small|heads?)?\s*[,.]?\s*(.+)$/i

function decodeHtmlEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
}

function parseIngredient(s: string): { amount: string; unit: string; name: string } {
  const cleaned = decodeHtmlEntities(s).replace(/\s+/g, ' ').trim()
  const m = cleaned.match(INGREDIENT_RE)
  if (m) {
    return {
      amount: (m[1] || '').trim(),
      unit: (m[2] || '').trim(),
      name: (m[3] || cleaned).trim(),
    }
  }
  return { amount: '', unit: '', name: cleaned }
}

function parseDuration(iso: string): number | null {
  // PT30M, PT1H30M, PT1H, etc.
  if (!iso) return null
  const h = iso.match(/(\d+)H/)
  const m = iso.match(/(\d+)M/)
  const hours = h ? parseInt(h[1]) : 0
  const mins = m ? parseInt(m[1]) : 0
  const total = hours * 60 + mins
  return total > 0 ? total : null
}

interface JsonLdRecipe {
  '@type'?: string | string[]
  name?: string
  recipeIngredient?: string[]
  recipeInstructions?: Array<string | { '@type'?: string; text?: string; name?: string }>
  prepTime?: string
  cookTime?: string
  recipeYield?: string | string[]
  image?: string | string[] | { url?: string }
  description?: string
}

function findRecipeInJsonLd(data: unknown): JsonLdRecipe | null {
  if (!data || typeof data !== 'object') return null

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInJsonLd(item)
      if (found) return found
    }
    return null
  }

  const obj = data as Record<string, unknown>

  // Check if this object is a Recipe
  const type = obj['@type']
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
    return obj as unknown as JsonLdRecipe
  }

  // Check @graph
  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    return findRecipeInJsonLd(obj['@graph'])
  }

  return null
}

export async function POST(req: NextRequest) {
  const { url } = await req.json() as { url?: string }
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FamilyDashboard/1.0 RecipeImporter' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return NextResponse.json({ error: `Failed to fetch URL: HTTP ${res.status}` }, { status: 422 })

    const html = await res.text()

    // Extract all JSON-LD blocks
    const jsonLdBlocks: string[] = []
    const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let match
    while ((match = re.exec(html)) !== null) {
      jsonLdBlocks.push(match[1])
    }

    let recipe: JsonLdRecipe | null = null
    for (const block of jsonLdBlocks) {
      try {
        const parsed = JSON.parse(block)
        recipe = findRecipeInJsonLd(parsed)
        if (recipe) break
      } catch { /* skip invalid JSON */ }
    }

    if (!recipe) {
      return NextResponse.json({ error: 'Could not find recipe data on this page. The site may not support recipe import.' }, { status: 422 })
    }

    // Parse ingredients
    const ingredients = (recipe.recipeIngredient || []).map(parseIngredient)

    // Parse instructions
    const instructions: string[] = []
    for (const step of recipe.recipeInstructions || []) {
      if (typeof step === 'string') {
        instructions.push(step.trim())
      } else if (step && typeof step === 'object') {
        const text = step.text || step.name || ''
        if (text) instructions.push(text.trim())
      }
    }

    // Parse yield/servings
    let servings: number | null = null
    const yld = recipe.recipeYield
    if (yld) {
      const yldStr = Array.isArray(yld) ? yld[0] : yld
      const num = parseInt(yldStr)
      if (!isNaN(num)) servings = num
    }

    // Parse image
    let imageUrl: string | null = null
    if (typeof recipe.image === 'string') imageUrl = recipe.image
    else if (Array.isArray(recipe.image)) imageUrl = recipe.image[0]
    else if (recipe.image && typeof recipe.image === 'object') imageUrl = recipe.image.url || null

    return NextResponse.json({
      title: recipe.name || '',
      description: recipe.description || '',
      ingredients,
      instructions,
      prepTime: parseDuration(recipe.prepTime || ''),
      cookTime: parseDuration(recipe.cookTime || ''),
      servings,
      imageUrl,
      sourceUrl: url,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Import failed: ${message}` }, { status: 500 })
  }
}
