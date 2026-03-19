import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exchangeCode, getPrimaryCalendarId } from '@/lib/google'

/**
 * Shared logic: exchange an authorization code, fetch the primary calendar ID,
 * and persist tokens on the FamilyMember record.
 */
async function connectGoogle(code: string, memberId: string) {
  const { access_token, refresh_token, expiry_date } = await exchangeCode(code)
  const googleCalendarId = await getPrimaryCalendarId(access_token)

  await prisma.familyMember.update({
    where: { id: memberId },
    data: {
      googleAccessToken: access_token,
      googleRefreshToken: refresh_token,
      googleCalendarId,
      googleTokenExpiry: new Date(expiry_date),
    },
  })

  return { googleCalendarId }
}

/**
 * GET /api/google/callback?code=<code>&state=<memberId>
 *
 * Handles the Google OAuth2 redirect. Exchanges the authorization code for
 * tokens, looks up the user's primary Google Calendar, persists the tokens
 * on the FamilyMember record, then redirects to /?settings=true.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl

  const code = searchParams.get('code')
  const memberId = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError) {
    return NextResponse.redirect(new URL('/?settings=true&googleError=' + encodeURIComponent(oauthError), req.url))
  }

  if (!code || !memberId) {
    return NextResponse.json(
      { error: 'Missing required query parameters: code and state (memberId)' },
      { status: 400 },
    )
  }

  try {
    await connectGoogle(code, memberId)
    return NextResponse.redirect(new URL('/?settings=true&googleConnected=true', req.url))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[google/callback] error:', message)
    return NextResponse.redirect(
      new URL('/?settings=true&googleError=' + encodeURIComponent(message), req.url),
    )
  }
}

/**
 * POST /api/google/callback  { code, memberId }
 *
 * Manual code exchange for when the OAuth redirect can't reach the server
 * directly (e.g. redirect goes to localhost but you're accessing the
 * dashboard via a LAN IP).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as { code?: string; memberId?: string }
    const { code, memberId } = body

    if (!code || !memberId) {
      return NextResponse.json(
        { error: 'code and memberId are required' },
        { status: 400 },
      )
    }

    const result = await connectGoogle(code, memberId)
    return NextResponse.json({ ok: true, calendarId: result.googleCalendarId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[google/callback POST] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
