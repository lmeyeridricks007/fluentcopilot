import type { QuickCaptureApiStatus } from '@/lib/api/quickCaptureClient'

/** Statuses we never surface on the From-your-day hub (no text practice loop). */
const BLOCKED: QuickCaptureApiStatus[] = ['archived', 'practiced', 'saved_long_term']

export function captureHasPracticeableText(c: { bodyPrimary?: string | null; transcript?: string | null }): boolean {
  return Boolean((c.bodyPrimary ?? c.transcript ?? '').trim())
}

/** Same rule as backend pack generation: any same-day capture with text except archived / finished buckets. */
export function isCaptureEligibleForFromYourDayHub(c: {
  status: QuickCaptureApiStatus
  bodyPrimary?: string | null
  transcript?: string | null
}): boolean {
  return captureHasPracticeableText(c) && !BLOCKED.includes(c.status)
}
