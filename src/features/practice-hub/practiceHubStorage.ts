/**
 * Client persistence for "Continue practicing" (last scenario + mode).
 */
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { PRACTICE_DOMAIN_BASE_KEYS, userScopedLocalKey } from '@/lib/storage/storageKeys'

const CONTINUE_BASE = PRACTICE_DOMAIN_BASE_KEYS.practiceContinue

function storageKey(): string {
  if (typeof window === 'undefined') return CONTINUE_BASE
  return userScopedLocalKey(CONTINUE_BASE, getRetentionUserId())
}

export interface LastPracticeContinue {
  scenarioId: string
  title: string
  mode: 'guided' | 'semi_guided' | 'free'
  updatedAt: string
}

export function getLastPracticeContinue(): LastPracticeContinue | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return null
    const v = JSON.parse(raw) as LastPracticeContinue
    if (!v?.scenarioId || !v.title) return null
    return v
  } catch {
    return null
  }
}

export function setLastPracticeContinue(data: LastPracticeContinue): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(), JSON.stringify(data))
  } catch {
    /* quota */
  }
}
