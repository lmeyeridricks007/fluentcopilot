'use client'

import { weaknessSignalEventSchema, type WeaknessSignalEvent } from '@/lib/schemas/practice/weaknessInsight.schema'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { PRACTICE_DOMAIN_BASE_KEYS, userScopedLocalKey } from '@/lib/storage/storageKeys'

const WEAK_SIG_BASE = PRACTICE_DOMAIN_BASE_KEYS.lastPracticeWeakSignals
const MAX_AGE_MS = 7 * 86_400_000

function storageKey(): string {
  if (typeof window === 'undefined') return WEAK_SIG_BASE
  return userScopedLocalKey(WEAK_SIG_BASE, getRetentionUserId())
}

function read(): WeaknessSignalEvent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return null
    const p = weaknessSignalEventSchema.safeParse(JSON.parse(raw))
    return p.success ? p.data : null
  } catch {
    return null
  }
}

function write(data: WeaknessSignalEvent) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(), JSON.stringify(data))
    window.dispatchEvent(new CustomEvent('lt-weakness-updated'))
  } catch {
    /* quota */
  }
}

export function recordLastPracticeWeakSignals(input: {
  tags: string[]
  scenarioId: string
  outcome?: 'success' | 'partial' | 'needs_practice'
}): void {
  const payload: WeaknessSignalEvent = {
    kind: 'last_practice',
    recordedAt: new Date().toISOString(),
    scenarioId: input.scenarioId,
    tags: [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
    outcome: input.outcome,
  }
  write(payload)
}

export function loadLastPracticeWeakSignals(): WeaknessSignalEvent | null {
  const row = read()
  if (!row) return null
  if (Date.now() - new Date(row.recordedAt).getTime() > MAX_AGE_MS) {
    return null
  }
  return row
}
