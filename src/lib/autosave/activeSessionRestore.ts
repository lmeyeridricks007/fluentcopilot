import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { AutosaveDomain } from './types'

export function trackAutosaveRestored(domain: AutosaveDomain, entityId: string): void {
  track(ANALYTICS_EVENTS.autosave_restored, {
    domain,
    entity_id: entityId,
  })
}
