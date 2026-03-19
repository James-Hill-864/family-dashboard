import { NextRequest, NextResponse } from 'next/server'
import { syncMemberCalendar } from '@/lib/google-sync'
import { broadcastUpdate } from '@/lib/sse'

/**
 * POST /api/google/sync
 * Body: { memberId: string }
 *
 * Syncs Google Calendar events for a member and removes stale events.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let memberId: string

  try {
    const body = (await req.json()) as { memberId?: string }
    if (!body.memberId) {
      return NextResponse.json({ error: 'memberId is required in the request body' }, { status: 400 })
    }
    memberId = body.memberId
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const result = await syncMemberCalendar(memberId)
    broadcastUpdate('events')
    return NextResponse.json({ synced: result.synced, deleted: result.deleted })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[google/sync] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
