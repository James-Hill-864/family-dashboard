import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google'

/**
 * GET /api/google/auth?memberId=<id>
 *
 * Redirects the browser to the Google OAuth2 consent screen.
 * The memberId is encoded as the OAuth `state` parameter so it is returned
 * to the callback unchanged.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const memberId = req.nextUrl.searchParams.get('memberId')

  if (!memberId) {
    return NextResponse.json(
      { error: 'memberId query parameter is required' },
      { status: 400 },
    )
  }

  const authUrl = getAuthUrl(memberId)
  return NextResponse.redirect(authUrl)
}
