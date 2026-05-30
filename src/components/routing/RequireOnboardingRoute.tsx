'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { ROUTES, buildLoginUrlWithNext } from '@/lib/routing/authRedirects'
import { AuthRoutingSplash } from './AuthRoutingSplash'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

/**
 * Onboarding is private: requires session. If onboarding already completed, send user to app home.
 */
export function RequireOnboardingRoute({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isReady, isAuthenticated, hasCompletedOnboarding } = useAuth()

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) {
      const to = buildLoginUrlWithNext(pathname || ROUTES.onboarding)
      track(ANALYTICS_EVENTS.route_guard_redirected_to_login, { from: pathname, reason: 'onboarding_requires_auth' })
      router.replace(to)
      return
    }
    if (hasCompletedOnboarding) {
      track(ANALYTICS_EVENTS.route_guard_redirected_to_app, { from: pathname, to: ROUTES.appHome, reason: 'onboarding_complete' })
      router.replace(ROUTES.appHome)
    }
  }, [isReady, isAuthenticated, hasCompletedOnboarding, pathname, router])

  if (!isReady) {
    return <AuthRoutingSplash />
  }

  if (!isAuthenticated) {
    return <AuthRoutingSplash message="Redirecting to sign in…" />
  }

  if (hasCompletedOnboarding) {
    return <AuthRoutingSplash message="Opening your home…" />
  }

  return <>{children}</>
}
