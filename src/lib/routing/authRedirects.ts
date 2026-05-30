/**
 * Central redirect targets for auth + route guards.
 * Replace path strings in guards with imports from here.
 */

export const ROUTES = {
  login: '/login',
  /** After sign-out — clear entry to sign in again */
  postSignOut: '/login',
  publicHome: '/',
  appHome: '/app/talk',
  onboarding: '/onboarding',
} as const

/**
 * Where a signed-in user should land when leaving auth-only public pages.
 */
export function getPrivateEntryPath(hasCompletedOnboarding: boolean): string {
  return hasCompletedOnboarding ? ROUTES.appHome : ROUTES.onboarding
}

/**
 * Login URL with optional return path (validated at consumption time).
 */
export function buildLoginUrlWithNext(fromPath: string): string {
  const q = new URLSearchParams()
  if (fromPath && fromPath !== ROUTES.login) {
    q.set('next', fromPath)
  }
  const s = q.toString()
  return s ? `${ROUTES.login}?${s}` : ROUTES.login
}

/** Prevent open redirects — only in-app learner paths are accepted for `next`. */
export function isSafePrivateNextPath(path: string | null): path is string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return false
  if (path === '/app' || path.startsWith('/app/')) return true
  if (path === ROUTES.onboarding || path.startsWith(`${ROUTES.onboarding}/`)) return true
  return false
}
