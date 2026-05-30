import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { getUserDrafts, setUserDrafts } from '@/lib/storage/draftStorage'
import type { AutosaveAnalyticsContext, AutosaveEnvelopeV1 } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

function wrapEnvelope(
  domain: AutosaveAnalyticsContext['domain'],
  entityId: string,
  body: unknown
): AutosaveEnvelopeV1 {
  return {
    v: 1,
    domain,
    entityId,
    savedAt: nowIso(),
    body,
  }
}

export function readAutosaveEnvelope(userId: string, logicalKey: string): AutosaveEnvelopeV1 | null {
  if (!userId) return null
  try {
    const doc = getUserDrafts(userId)
    const entry = doc.writingDrafts?.[logicalKey]
    if (!entry?.payload || typeof entry.payload !== 'object') return null
    const p = entry.payload as Partial<AutosaveEnvelopeV1>
    if (p.v !== 1 || !p.domain || typeof p.entityId !== 'string') return null
    return p as AutosaveEnvelopeV1
  } catch {
    return null
  }
}

export function readAutosaveBody(userId: string, logicalKey: string): unknown | null {
  return readAutosaveEnvelope(userId, logicalKey)?.body ?? null
}

export function writeAutosaveDraft(
  userId: string,
  logicalKey: string,
  domain: AutosaveAnalyticsContext['domain'],
  entityId: string,
  body: unknown,
  ctx: Pick<AutosaveAnalyticsContext, 'save_mode'>
): void {
  if (!userId) return
  track(ANALYTICS_EVENTS.autosave_triggered, {
    domain,
    entity_id: entityId,
    save_mode: ctx.save_mode,
  })
  try {
    const doc = getUserDrafts(userId)
    const writingDrafts = { ...(doc.writingDrafts ?? {}) }
    writingDrafts[logicalKey] = {
      updatedAt: nowIso(),
      payload: wrapEnvelope(domain, entityId, body),
    }
    setUserDrafts(userId, { ...doc, writingDrafts })
    track(ANALYTICS_EVENTS.autosave_completed, {
      domain,
      entity_id: entityId,
      save_mode: ctx.save_mode,
    })
  } catch {
    track(ANALYTICS_EVENTS.autosave_failed, {
      domain,
      entity_id: entityId,
      save_mode: ctx.save_mode,
    })
  }
}

export function removeAutosaveDraft(
  userId: string,
  logicalKey: string,
  domain: AutosaveAnalyticsContext['domain'],
  entityId: string,
  reason: 'submit' | 'complete' | 'discard' | 'restart' | 'obsolete'
): void {
  if (!userId) return
  try {
    const doc = getUserDrafts(userId)
    if (!doc.writingDrafts?.[logicalKey]) return
    const writingDrafts = { ...doc.writingDrafts }
    delete writingDrafts[logicalKey]
    setUserDrafts(userId, { ...doc, writingDrafts })
    track(ANALYTICS_EVENTS.autosave_discarded, {
      domain,
      entity_id: entityId,
      discard_reason: reason,
    })
  } catch {
    track(ANALYTICS_EVENTS.autosave_failed, {
      domain,
      entity_id: entityId,
      save_mode: 'immediate',
    })
  }
}
