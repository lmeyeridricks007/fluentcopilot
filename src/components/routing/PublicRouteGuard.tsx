'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { isAuthOnlyPublicPath } from '@/lib/routing/publicPrivateRoutes'
import { getPrivateEntryPath } from '@/lib/routing/authRedirects'
import { AuthRoutingSplash } from './AuthRoutingSplash'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

/**
 * Wraps public marketing routes: waits for auth bootstrap; keeps signed-in users off
 * auth-only pages (/login, /signup, /forgot-password) by redirecting into the app.
 */
export function PublicRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isReady, isAuthenticated, hasCompletedOnboarding } = useAuth()

  const authOnly = isAuthOnlyPublicPath(pathname)

  useEffect(() => {
    if (!isReady || !authOnly || !isAuthenticated) return
    const to = getPrivateEntryPath(hasCompletedOnboarding)
    track(ANALYTICS_EVENTS.auth_only_page_redirected, { from: pathname, to })
    track(ANALYTICS_EVENTS.route_guard_redirected_to_app, { from: pathname, to })
    router.replace(to)
  }, [isReady, authOnly, isAuthenticated, hasCompletedOnboarding, pathname, router])

  if (!isReady) {
    return <AuthRoutingSplash />
  }

  if (authOnly && isAuthenticated) {
    return <AuthRoutingSplash message="Taking you to the app…" />
  }

  return <>{children}</>
}
