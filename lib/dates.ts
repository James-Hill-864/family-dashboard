/**
 * Date utilities for handling timezone-safe queries.
 *
 * Google Calendar stores all-day events at UTC midnight (e.g., 2026-03-20T00:00:00Z).
 * Local midnight in Eastern time is 04:00/05:00 UTC, creating a gap where all-day
 * events get excluded from date range queries. These helpers provide the right
 * boundaries for Prisma queries that need to include both all-day and timed events.
 */

/**
 * Returns UTC midnight for today's local date.
 * Use as the LOWER bound when querying events that include Google all-day events.
 * Example: local date is March 20 EDT → returns 2026-03-20T00:00:00Z
 */
export function utcStartOfToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

/**
 * Returns UTC midnight for tomorrow's local date.
 * Example: local date is March 20 EDT → returns 2026-03-21T00:00:00Z
 */
export function utcStartOfTomorrow(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1))
}

/**
 * Returns local midnight for today.
 * Use for locally-created data (chores, todos) that don't involve Google events.
 */
export function localStartOfToday(): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Returns local midnight for tomorrow.
 */
export function localStartOfTomorrow(): Date {
  const d = localStartOfToday()
  d.setDate(d.getDate() + 1)
  return d
}

/**
 * Returns today's local date as a YYYY-MM-DD string (no timezone ambiguity).
 */
export function todayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
