'use client'

import { useCallback, useRef } from 'react'
import { track, type AnalyticsEvent } from '@/lib/analytics'

/**
 * Fire an analytics event once when the section scrolls into view (mobile-friendly).
 */
export function useSpeakingExamSectionReveal(
  event: AnalyticsEvent,
  getProps: () => Record<string, unknown>,
  enabled: boolean
): (el: HTMLElement | null) => void {
  const fired = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  return useCallback(
    (el: HTMLElement | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null
      if (!enabled || !el || fired.current) return

      const obs = new IntersectionObserver(
        (entries) => {
          const hit = entries.some((e) => e.isIntersecting)
          if (hit && !fired.current) {
            fired.current = true
            track(event, getProps())
            obs.disconnect()
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
      )
      observerRef.current = obs
      obs.observe(el)
    },
    [enabled, event, getProps]
  )
}
