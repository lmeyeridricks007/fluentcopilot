import { buildAnalyticsBaseContext } from '@/lib/analytics/analyticsContextBuilder'
import { categoryForEvent } from '@/lib/analytics/eventCategories'

export type AnalyticsPayload = Record<string, unknown>

/**
 * Provider hook — swap for Segment / GA4 / PostHog.
 */
export type AnalyticsSink = (eventName: string, payload: AnalyticsPayload) => void

let customSink: AnalyticsSink | null = null

export function setAnalyticsSink(sink: AnalyticsSink | null): void {
  customSink = sink
}

/**
 * Central dispatch: merges session / user / timestamp / category into every event.
 * UI code should prefer `track()` from `@/lib/analytics` (re-exports this).
 */
export function emitAnalyticsEvent(eventName: string, properties: AnalyticsPayload = {}): void {
  const base = buildAnalyticsBaseContext()
  const category = categoryForEvent(eventName)
  const payload: AnalyticsPayload = {
    event_name: eventName,
    event_category: category,
    ...base,
    ...properties,
  }

  if (customSink) {
    customSink(eventName, payload)
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[analytics]', eventName, payload)
  }

  if (typeof window !== 'undefined') {
    const w = window as unknown as {
      analytics?: { track?: (e: string, p?: AnalyticsPayload) => void }
    }
    w.analytics?.track?.(eventName, payload)
  }
}
