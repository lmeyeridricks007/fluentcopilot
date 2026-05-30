import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { IncrementalSaveDomain, IncrementalSaveMode, IncrementalSaveResult } from './types'

export type DebouncedFlush = () => void

/**
 * Coalesce rapid calls; always schedules `fn` after `ms` quiet period.
 */
export function createDebouncedFlush(ms: number, fn: () => void): DebouncedFlush {
  let id: number | null = null
  return () => {
    if (typeof window === 'undefined') {
      fn()
      return
    }
    if (id != null) window.clearTimeout(id)
    id = window.setTimeout(() => {
      id = null
      fn()
    }, ms)
  }
}

export function runIncrementalSave(options: {
  domain: IncrementalSaveDomain
  mode: IncrementalSaveMode
  persist: () => boolean | void
  eventType?: string
}): IncrementalSaveResult {
  const { domain, mode, persist, eventType } = options
  if (typeof window === 'undefined') return 'skipped'

  track(ANALYTICS_EVENTS.incremental_save_triggered, {
    domain,
    mode,
    event_type: eventType ?? 'unspecified',
  })

  try {
    const ok = persist()
    if (ok === false) {
      track(ANALYTICS_EVENTS.incremental_save_failed, {
        domain,
        mode,
        reason: 'persist_returned_false',
        event_type: eventType,
      })
      return 'failed'
    }
    track(ANALYTICS_EVENTS.incremental_save_completed, {
      domain,
      mode,
      event_type: eventType,
    })
    return 'completed'
  } catch (e) {
    track(ANALYTICS_EVENTS.incremental_save_failed, {
      domain,
      mode,
      reason: e instanceof Error ? e.message : 'unknown_error',
      event_type: eventType,
    })
    return 'failed'
  }
}
