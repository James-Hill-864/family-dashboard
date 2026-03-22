/**
 * Google Calendar OAuth2 integration module.
 * Uses the native fetch API — no googleapis package required.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_DRIVE_BASE = 'https://www.googleapis.com/drive/v3'

const GOOGLE_PHOTOS_BASE = 'https://photoslibrary.googleapis.com/v1'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/photoslibrary.readonly',
]

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface GoogleEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  htmlLink: string
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  error?: string
  error_description?: string
}

interface CalendarListEntry {
  id: string
  primary?: boolean
}

interface CalendarListResponse {
  items: CalendarListEntry[]
  error?: { message: string }
}

interface CalendarEventsResponse {
  items: GoogleEvent[]
  error?: { message: string }
}

export interface GooglePhoto {
  id: string
  baseUrl: string
  name?: string
}

export interface GoogleAlbum {
  id: string
  title: string
  mediaItemsCount?: string
}

interface DriveFile {
  id: string
  name: string
  thumbnailLink?: string
  webContentLink?: string
}

interface DriveFolder {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clientId(): string {
  const v = process.env.GOOGLE_CLIENT_ID
  if (!v) throw new Error('GOOGLE_CLIENT_ID environment variable is not set')
  return v
}

function clientSecret(): string {
  const v = process.env.GOOGLE_CLIENT_SECRET
  if (!v) throw new Error('GOOGLE_CLIENT_SECRET environment variable is not set')
  return v
}

function redirectUri(): string {
  const v = process.env.GOOGLE_REDIRECT_URI
  if (!v) throw new Error('GOOGLE_REDIRECT_URI environment variable is not set')
  return v
}

async function assertOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json() as { error?: string | { message?: string }; error_description?: string }
      if (typeof body.error === 'string') {
        detail = body.error_description ?? body.error
      } else if (typeof body.error === 'object' && body.error !== null && body.error.message) {
        detail = body.error.message ?? detail
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(`${context}: HTTP ${res.status} — ${detail}`)
  }
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Builds the Google OAuth2 authorization URL.
 * Pass `memberId` as the `state` parameter so it survives the redirect.
 */
export function getAuthUrl(memberId: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: memberId,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Exchanges an authorization code for access + refresh tokens.
 */
export async function exchangeCode(
  code: string,
): Promise<{ access_token: string; refresh_token: string; expiry_date: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }).toString(),
  })

  await assertOk(res, 'exchangeCode')
  const data = (await res.json()) as TokenResponse

  if (!data.access_token) {
    throw new Error(`exchangeCode: no access_token in response — ${data.error_description ?? data.error ?? 'unknown error'}`)
  }
  if (!data.refresh_token) {
    throw new Error('exchangeCode: no refresh_token in response. Ensure prompt=consent is set and the user has not already granted access without revoking.')
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + data.expires_in * 1000,
  }
}

/**
 * Uses a refresh token to obtain a new access token.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expiry_date: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: 'refresh_token',
    }).toString(),
  })

  await assertOk(res, 'refreshAccessToken')
  const data = (await res.json()) as TokenResponse

  if (!data.access_token) {
    throw new Error(`refreshAccessToken: no access_token in response — ${data.error_description ?? data.error ?? 'unknown error'}`)
  }

  return {
    access_token: data.access_token,
    expiry_date: Date.now() + data.expires_in * 1000,
  }
}

/**
 * Fetches events from a Google Calendar within the given time window.
 */
export async function getCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
  })

  const encodedId = encodeURIComponent(calendarId)
  const url = `${GOOGLE_CALENDAR_BASE}/calendars/${encodedId}/events?${params.toString()}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  await assertOk(res, 'getCalendarEvents')
  const data = (await res.json()) as CalendarEventsResponse

  if (data.error) {
    throw new Error(`getCalendarEvents: ${data.error.message}`)
  }

  return data.items ?? []
}

/**
 * Creates a new event in a Google Calendar.
 */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: object,
): Promise<GoogleEvent> {
  const encodedId = encodeURIComponent(calendarId)
  const url = `${GOOGLE_CALENDAR_BASE}/calendars/${encodedId}/events`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  await assertOk(res, 'createCalendarEvent')
  return (await res.json()) as GoogleEvent
}

/**
 * Deletes an event from a Google Calendar.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const encodedCalId = encodeURIComponent(calendarId)
  const encodedEventId = encodeURIComponent(eventId)
  const url = `${GOOGLE_CALENDAR_BASE}/calendars/${encodedCalId}/events/${encodedEventId}`

  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  // 204 No Content is the success response for DELETE
  if (res.status === 404) {
    throw new Error(`deleteCalendarEvent: event ${eventId} not found in calendar ${calendarId}`)
  }
  await assertOk(res, 'deleteCalendarEvent')
}

/**
 * Fetches the primary calendar ID for the authenticated user.
 */
export async function getPrimaryCalendarId(accessToken: string): Promise<string> {
  const url = `${GOOGLE_CALENDAR_BASE}/users/me/calendarList`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  await assertOk(res, 'getPrimaryCalendarId')
  const data = (await res.json()) as CalendarListResponse

  if (data.error) {
    throw new Error(`getPrimaryCalendarId: ${data.error.message}`)
  }

  const primary = (data.items ?? []).find((c) => c.primary)
  if (!primary) {
    throw new Error('getPrimaryCalendarId: could not find a primary calendar in the calendar list')
  }

  return primary.id
}

/**
 * Fetches image files from Google Drive for the slideshow.
 * If folderId is provided, lists images from that folder only.
 * Returns empty array if scope not granted.
 */
export async function getPhotos(
  accessToken: string,
  folderId?: string,
  pageSize = 50,
): Promise<GooglePhoto[]> {
  const q = folderId
    ? `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`
    : `mimeType contains 'image/' and trashed = false`

  const params = new URLSearchParams({
    q,
    pageSize: String(pageSize),
    fields: 'files(id,name,thumbnailLink)',
    orderBy: 'modifiedTime desc',
  })

  const res = await fetch(`${GOOGLE_DRIVE_BASE}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    console.error(`[google/drive] photos failed: HTTP ${res.status} — ${await res.text()}`)
    return []
  }
  const data = (await res.json()) as { files?: DriveFile[] }
  const files = data.files ?? []
  // Convert to GooglePhoto format, use thumbnailLink scaled up
  const photos = files
    .filter(f => f.thumbnailLink)
    .map(f => ({
      id: f.id,
      baseUrl: f.thumbnailLink!.replace(/=s\d+/, '=s1920'),
      name: f.name,
    }))
  // Shuffle
  return photos.sort(() => Math.random() - 0.5)
}

/**
 * Fetches folders from Google Drive that contain images.
 * These serve as "albums" for the photos slideshow.
 */
export async function getPhotoAlbums(accessToken: string): Promise<GoogleAlbum[]> {
  // Find folders that have image files in them
  const params = new URLSearchParams({
    q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    pageSize: '50',
    fields: 'files(id,name)',
    orderBy: 'name',
  })

  const res = await fetch(`${GOOGLE_DRIVE_BASE}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`[google/drive] folders failed: HTTP ${res.status} — ${body}`)
    return []
  }
  const data = (await res.json()) as { files?: DriveFolder[] }
  const folders = data.files ?? []

  return folders.map(f => ({
    id: f.id,
    title: f.name,
  }))
}

/**
 * Fetches photos taken "on this day" (same month/day) from previous years
 * using the Google Photos Library API.
 */
export async function getOnThisDayPhotos(
  accessToken: string,
  month: number,
  day: number,
): Promise<Array<{ id: string; baseUrl: string; year: number; name?: string }>> {
  const res = await fetch(`${GOOGLE_PHOTOS_BASE}/mediaItems:search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pageSize: 50,
      filters: {
        dateFilter: {
          dates: [{ month, day, year: 0 }],
        },
        mediaTypeFilter: { mediaTypes: ['PHOTO'] },
      },
    }),
  })

  if (!res.ok) {
    console.error(`[google/photos] On this day failed: HTTP ${res.status} — ${await res.text()}`)
    return []
  }

  interface PhotoItem {
    id: string
    baseUrl: string
    filename?: string
    mediaMetadata?: { creationTime?: string }
  }
  const data = (await res.json()) as { mediaItems?: PhotoItem[] }
  const items = data.mediaItems ?? []

  return items.map(item => ({
    id: item.id,
    baseUrl: `${item.baseUrl}=w1920-h1200`,
    year: item.mediaMetadata?.creationTime ? new Date(item.mediaMetadata.creationTime).getFullYear() : 0,
    name: item.filename,
  })).sort(() => Math.random() - 0.5)
}
