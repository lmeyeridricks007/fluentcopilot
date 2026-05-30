import { getApiBaseUrl } from '@/lib/api/apiConfig'
import {
  hintsFromQuickCaptureApiSummary,
  type FromYourDaySuggestionHints,
} from '@/lib/progression/fromYourDaySuggestionHeuristics'

/**
 * Server-side fetch of Quick Capture summary for Today suggestion ranking (Next.js routes).
 */
export async function fetchQuickCaptureTodaySummaryForSuggestion(
  userId: string,
  localDateYmd: string,
): Promise<FromYourDaySuggestionHints | null> {
  const base = getApiBaseUrl()
  if (!base) return null
  const url = `${base.replace(/\/+$/, '')}/api/quick-captures?${new URLSearchParams({
    summary: '1',
    localDate: localDateYmd,
  }).toString()}`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'x-user-id': userId },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as Record<string, unknown>
    return hintsFromQuickCaptureApiSummary(json)
  } catch {
    return null
  }
}
