/**
 * Calendar-day helpers for streaks and daily rollups.
 * Prefer passing the learner’s IANA `timeZone` (e.g. `America/New_York`) from profile or client.
 */

/**
 * Returns `YYYY-MM-DD` for `now` interpreted in `timeZone` (IANA). Defaults to UTC.
 */
export function getTodayISO(now: Date = new Date(), timeZone: string = 'UTC'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * Compare two instants or calendar-day strings in the same `timeZone` (IANA, default UTC).
 * - `YYYY-MM-DD` strings are treated as opaque calendar buckets (not re-parsed as UTC midnight).
 * - Other strings are parsed as `Date` then mapped with `Intl` into that zone’s calendar day.
 */
export function isSameDay(
  date1: string | Date,
  date2: string | Date,
  timeZone: string = 'UTC',
): boolean {
  return calendarDayBucket(date1, timeZone) === calendarDayBucket(date2, timeZone)
}

function calendarDayBucket(input: string | Date, timeZone: string): string {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed
    }
    const parsed = new Date(trimmed)
    if (Number.isNaN(parsed.getTime())) {
      throw new RangeError(`Invalid date string: ${input}`)
    }
    return getTodayISO(parsed, timeZone)
  }
  if (Number.isNaN(input.getTime())) {
    throw new RangeError('Invalid Date')
  }
  return getTodayISO(input, timeZone)
}
