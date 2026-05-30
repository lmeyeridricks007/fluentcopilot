import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { ANALYTICS_EVENTS } from '@/lib/analytics'
import type { SupportTopic } from '@/lib/contact/submitSupportRequestClient'

export function trackContactFormViewed(props: { source_surface: string; route?: string }) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.contact_form_viewed, props)
}

export function trackContactFormSubmitted(props: {
  source_surface: string
  route?: string
  topic: SupportTopic
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.contact_form_submitted, props)
}

export function trackContactFormSucceeded(props: {
  source_surface: string
  route?: string
  topic: SupportTopic
  delivered?: boolean
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.contact_form_succeeded, props)
}

export function trackContactFormFailed(props: {
  source_surface: string
  route?: string
  topic: SupportTopic
  reason: 'validation' | 'network' | 'server'
}) {
  emitAnalyticsEvent(ANALYTICS_EVENTS.contact_form_failed, props)
}
