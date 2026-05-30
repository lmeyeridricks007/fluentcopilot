/**
 * Developer-only visibility for exam internals (blueprint, scoring, readiness, suggestions).
 * Never enabled in production builds — see {@link isExamDevDebugEnabled}.
 */

const SESSION_FLAG = 'fc-exam-dev-debug'

/** Call once on the client after navigation (e.g. exam layout). Strips `examDebug=1` from the URL. */
export function collectExamDebugQueryParam(): void {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV === 'production') return
  try {
    const u = new URL(window.location.href)
    if (u.searchParams.get('examDebug') !== '1') return
    sessionStorage.setItem(SESSION_FLAG, '1')
    u.searchParams.delete('examDebug')
    const next = `${u.pathname}${u.search}${u.hash}`
    window.history.replaceState({}, '', next)
  } catch {
    /* ignore */
  }
}

/**
 * True when debug UI may render. Production is always false.
 * Non-production: `NEXT_PUBLIC_EXAM_DEV_DEBUG=1` **or** session flag set via `?examDebug=1` (see {@link collectExamDebugQueryParam}).
 */
export function isExamDevDebugEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  if (process.env.NEXT_PUBLIC_EXAM_DEV_DEBUG === '1') return true
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_FLAG) === '1'
  } catch {
    return false
  }
}
