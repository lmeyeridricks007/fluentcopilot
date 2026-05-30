'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { buildLoginUrlWithNext, ROUTES } from '@/lib/routing/authRedirects'
import { AuthRoutingSplash } from '@/components/routing/AuthRoutingSplash'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

export function RequireAuth({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isReady, isAuthenticated, hasCompletedOnboarding } = useAuth()

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) {
      const to = buildLoginUrlWithNext(pathname || ROUTES.appHome)
      track(ANALYTICS_EVENTS.route_guard_redirected_to_login, {
        from: pathname,
        reason: 'private_app_requires_auth',
      })
      router.replace(to)
      return
    }
    if (!hasCompletedOnboarding) {
      track(ANALYTICS_EVENTS.route_guard_redirected_to_app, {
        from: pathname,
        to: ROUTES.onboarding,
        reason: 'onboarding_incomplete',
      })
      track(ANALYTICS_EVENTS.onboarding_resume_forced, {
        from: pathname,
        reason: 'guard_incomplete_onboarding',
      })
      router.replace(ROUTES.onboarding)
    }
  }, [isReady, isAuthenticated, hasCompletedOnboarding, pathname, router])

  if (!isReady) {
    return <AuthRoutingSplash />
  }

  if (!isAuthenticated || !hasCompletedOnboarding) {
    return <AuthRoutingSplash message="Redirecting…" />
  }

  return <>{children}</>
}
