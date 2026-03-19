import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/recipes/discover?q=chicken
 * Searches recipe sites and returns URLs + titles for import.
 * Uses DuckDuckGo HTML search to find recipes from popular sites.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  if (!query) return NextResponse.json([])

  try {
    const searchQuery = `${query} recipe site:allrecipes.com OR site:foodnetwork.com OR site:simplyrecipes.com`
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, {
      headers: { 'User-Agent': 'FamilyDashboard/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return NextResponse.json([])

    const html = await res.text()
    const results: Array<{ title: string; url: string; snippet: string }> = []

    // Parse DuckDuckGo HTML results
    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi

    let match
    while ((match = linkRegex.exec(html)) !== null && results.length < 8) {
      const rawUrl = match[1]
      const title = match[2].replace(/<[^>]*>/g, '').trim()

      // DuckDuckGo wraps URLs — extract the actual URL
      let url = rawUrl
      const uddg = rawUrl.match(/uddg=([^&]+)/)
      if (uddg) url = decodeURIComponent(uddg[1])

      // Only include recipe site URLs
      if (url.includes('allrecipes.com') || url.includes('foodnetwork.com') || url.includes('simplyrecipes.com') || url.includes('delish.com') || url.includes('tasty.co')) {
        const snippetMatch = snippetRegex.exec(html)
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 100) : ''
        results.push({ title, url, snippet })
      }
    }

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}
