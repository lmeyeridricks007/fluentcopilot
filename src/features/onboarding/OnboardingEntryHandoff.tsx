'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  readPendingOnboardingHandoff,
  clearOnboardingStartHandoff,
  type OnboardingHandoffPayload,
} from '@/lib/onboarding-routing'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useAuthStore } from '@/store/authStore'

export type { OnboardingHandoffPayload }

/**
 * One-time personalized handoff after onboarding. Reads session storage; clears on dismiss.
 */
export function OnboardingEntryHandoff({ expectedRoute }: { expectedRoute: string }) {
  const [payload, setPayload] = useState<OnboardingHandoffPayload | null>(null)
  const trackedRef = useRef(false)
  useEffect(() => {
    const p = readPendingOnboardingHandoff(expectedRoute)
    setPayload(p)
    if (p && !trackedRef.current) {
      trackedRef.current = true
      const userPlan = useAuthStore.getState().user?.plan
      const routeProps = {
        pathway_key: p.pathwayKey,
        route: p.route,
        route_destination: p.route,
        recommended_path: p.pathwayKey,
        user_plan: userPlan,
      }
      track(ANALYTICS_EVENTS.onboarding_start_experience_shown, routeProps)
      track(ANALYTICS_EVENTS.onboarding_personalized_route_entered, routeProps)
      track(ANALYTICS_EVENTS.onboarding_start_route_entered, routeProps)
      track(ANALYTICS_EVENTS.plan_context_on_start_route, {
        phase: 'handoff_banner_shown',
        user_plan: userPlan,
        route_destination: p.route,
        recommended_path: p.pathwayKey,
      })
    }
  }, [expectedRoute])

  const dismiss = useCallback(() => {
    clearOnboardingStartHandoff()
    setPayload(null)
  }, [])

  if (!payload) return null

  return (
    <div
      className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-surface-elevated p-4 shadow-sm mb-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-3 items-start">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold text-primary-800 uppercase tracking-wide">Your path</p>
          <p className="text-body-lg font-semibold text-ink-primary mt-1 leading-snug">{payload.headline}</p>
          <p className="text-body-sm text-ink-secondary mt-1.5 leading-snug">{payload.subline}</p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 text-body-sm font-semibold text-primary-700 hover:underline"
          >
            Got it — let&apos;s go
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-2 text-ink-secondary hover:bg-surface-muted hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
