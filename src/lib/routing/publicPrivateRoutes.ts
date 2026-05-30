/**
 * Explicit public vs private route classification for the App Router tree.
 * Private app content lives under `/app/*`; onboarding is session-gated at `/onboarding`.
 */

/** Signed-out-only entry pages — signed-in users are redirected into the app. */
export const AUTH_ONLY_PUBLIC_PATHS = ['/login', '/signup', '/forgot-password'] as const

/** Marketing / product info — signed-in users may stay (pricing, features, etc.). */
const SHARED_PUBLIC_PREFIXES = [
  '/features',
  '/exam-prep',
  '/pricing',
  '/beta',
  '/privacy',
  '/terms',
  '/cookies',
  '/contact',
  '/about',
  '/faq',
] as const

export function isAuthOnlyPublicPath(pathname: string): boolean {
  return AUTH_ONLY_PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

/**
 * Shared marketing routes (not auth-only). `/` is the marketing home.
 */
export function isSharedPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  return SHARED_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function isPrivateAppPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/')
}

export function isOnboardingPath(pathname: string): boolean {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/')
}

/**
 * True when the path must never be shown without a valid session.
 */
export function requiresAuthentication(pathname: string): boolean {
  return isPrivateAppPath(pathname) || isOnboardingPath(pathname)
}

export type RouteAccessKind =
  | 'private_app'
  | 'onboarding'
  | 'auth_only_public'
  | 'shared_public'
  | 'other'

export function classifyPathname(pathname: string): RouteAccessKind {
  if (isPrivateAppPath(pathname)) return 'private_app'
  if (isOnboardingPath(pathname)) return 'onboarding'
  if (isAuthOnlyPublicPath(pathname)) return 'auth_only_public'
  if (isSharedPublicPath(pathname)) return 'shared_public'
  return 'other'
}
