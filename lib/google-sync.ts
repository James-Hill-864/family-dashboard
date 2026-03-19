import { prisma } from './prisma'
import { refreshAccessToken, getCalendarEvents, GoogleEvent } from './google'
import { broadcastUpdate } from './sse'

const SYNC_DAYS = 60

/**
 * Syncs a single member's Google Calendar events to the local database.
 * Also deletes local events that no longer exist on Google (stale cleanup).
 */
export async function syncMemberCalendar(memberId: string): Promise<{ synced: number; deleted: number }> {
  const member = await prisma.familyMember.findUnique({ where: { id: memberId } })
  if (!member?.googleAccessToken || !member?.googleCalendarId || !member?.googleRefreshToken) {
    return { synced: 0, deleted: 0 }
  }

  let accessToken = member.googleAccessToken
  const expiryMs = member.googleTokenExpiry ? member.googleTokenExpiry.getTime() : 0
  if (Date.now() >= expiryMs - 60_000) {
    try {
      const refreshed = await refreshAccessToken(member.googleRefreshToken)
      accessToken = refreshed.access_token
      await prisma.familyMember.update({
        where: { id: memberId },
        data: {
          googleAccessToken: refreshed.access_token,
          googleTokenExpiry: new Date(refreshed.expiry_date),
        },
      })
    } catch (err) {
      console.error(`[google-sync] token refresh failed for ${member.name}:`, err)
      return { synced: 0, deleted: 0 }
    }
  }

  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + SYNC_DAYS * 24 * 60 * 60 * 1000).toISOString()

  let events: GoogleEvent[]
  try {
    events = await getCalendarEvents(accessToken, member.googleCalendarId, timeMin, timeMax)
  } catch (err) {
    console.error(`[google-sync] calendar fetch failed for ${member.name}:`, err)
    return { synced: 0, deleted: 0 }
  }

  let synced = 0
  const fetchedGoogleIds = new Set<string>()

  for (const gEvent of events) {
    try {
      const googleEventId = gEvent.id
      fetchedGoogleIds.add(googleEventId)
      const isAllDay = !gEvent.start.dateTime
      const startTime = new Date(gEvent.start.dateTime ?? gEvent.start.date ?? '')
      const endTime = new Date(gEvent.end.dateTime ?? gEvent.end.date ?? '')
      const title = gEvent.summary ?? '(No title)'
      const description = gEvent.description ?? null

      // Auto-detect event type from title
      const titleLower = title.toLowerCase()
      let type = 'google'
      if (titleLower.includes('birthday') || titleLower.includes('bday')) {
        type = 'birthday'
      } else if (titleLower.includes('vacation') || titleLower.includes('holiday') || titleLower.includes('trip')) {
        type = 'vacation'
      }

      const existing = await prisma.calendarEvent.findFirst({ where: { googleEventId } })
      if (existing) {
        await prisma.calendarEvent.update({
          where: { id: existing.id },
          data: { title, description, startTime, endTime, allDay: isAllDay, type },
        })
      } else {
        await prisma.calendarEvent.create({
          data: { title, description, startTime, endTime, allDay: isAllDay, type, source: 'google', googleEventId, memberId },
        })
      }
      synced++
    } catch (err) {
      console.error(`[google-sync] failed to upsert event ${gEvent.id}:`, err)
    }
  }

  // Delete stale events: local google events for this member that are no longer on Google
  let deleted = 0
  try {
    const localGoogleEvents = await prisma.calendarEvent.findMany({
      where: {
        memberId,
        source: 'google',
        googleEventId: { not: null },
        startTime: { gte: new Date() },
      },
      select: { id: true, googleEventId: true },
    })

    const staleIds = localGoogleEvents
      .filter(e => e.googleEventId && !fetchedGoogleIds.has(e.googleEventId))
      .map(e => e.id)

    if (staleIds.length > 0) {
      const result = await prisma.calendarEvent.deleteMany({ where: { id: { in: staleIds } } })
      deleted = result.count
    }
  } catch (err) {
    console.error(`[google-sync] stale deletion failed for ${member.name}:`, err)
  }

  return { synced, deleted }
}

/**
 * Syncs all members with connected Google accounts and broadcasts an SSE update.
 */
export async function syncAllMembers(): Promise<void> {
  const members = await prisma.familyMember.findMany({
    where: { googleRefreshToken: { not: null } },
    select: { id: true, name: true },
  })

  for (const member of members) {
    try {
      const result = await syncMemberCalendar(member.id)
      if (result.synced > 0 || result.deleted > 0) {
        console.log(`[google-sync] ${member.name}: synced ${result.synced}, deleted ${result.deleted}`)
      }
    } catch (err) {
      console.error(`[google-sync] failed for ${member.name}:`, err)
    }
  }

  broadcastUpdate('events')
}
