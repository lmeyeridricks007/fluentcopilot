const SESSION_KEY = 'lt-analytics-session-v1'
const SESSION_MAX_MS = 1000 * 60 * 60 * 4 // 4h — browser session-ish

export type AnalyticsSession = {
  sessionId: string
  startedAtMs: number
}

function newSession(): AnalyticsSession {
  const sessionId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const startedAtMs = Date.now()
  return { sessionId, startedAtMs }
}

/**
 * Stable session id for funnel stitching (client-only; replace with server session when auth ships).
 */
export function getOrCreateAnalyticsSession(): AnalyticsSession {
  if (typeof window === 'undefined') {
    return { sessionId: 'ssr', startedAtMs: Date.now() }
  }
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const p = JSON.parse(raw) as AnalyticsSession
      if (p?.sessionId && typeof p.startedAtMs === 'number') {
        if (Date.now() - p.startedAtMs < SESSION_MAX_MS) return p
      }
    }
  } catch {
    /* ignore */
  }
  const next = newSession()
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  return next
}
