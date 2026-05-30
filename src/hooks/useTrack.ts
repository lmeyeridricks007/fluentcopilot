import { useCallback } from 'react'
import { track, type AnalyticsEvent } from '@/lib/analytics'

export function useTrack() {
  return useCallback((event: AnalyticsEvent, properties?: Record<string, unknown>) => {
    track(event, properties)
  }, [])
}
