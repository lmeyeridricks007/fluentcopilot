'use client'

import { useEffect } from 'react'
import { track, type AnalyticsEvent } from '@/lib/analytics'

export function MarketingPageTracker({
  event,
  page,
  route,
  source_surface,
}: {
  event: AnalyticsEvent
  /** When set, sent as `page` property (e.g. home, features). */
  page?: string
  /** Current path for funnel queries (e.g. /beta). */
  route?: string
  source_surface?: string
}) {
  useEffect(() => {
    const props: Record<string, unknown> = {}
    if (page != null) props.page = page
    if (route != null) props.route = route
    if (source_surface != null) props.source_surface = source_surface
    track(event, props)
  }, [event, page, route, source_surface])

  return null
}
