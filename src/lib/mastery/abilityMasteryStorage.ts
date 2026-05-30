'use client'

import {
  abilityMasteryStateSchema,
  type AbilityMasteryState,
  type AbilityProgressSnapshot,
} from '@/lib/schemas/practice/abilityMasteryState.schema'

const key = (userId: string) => `language-tutor-v4-ability-mastery-${userId}`

function readJson(raw: string | null): AbilityMasteryState | null {
  if (!raw) return null
  try {
    const p = abilityMasteryStateSchema.safeParse(JSON.parse(raw))
    return p.success ? p.data : null
  } catch {
    return null
  }
}

export function loadAbilityMasteryState(userId: string): AbilityMasteryState {
  if (typeof window === 'undefined') {
    return { version: 1, userId, byAbility: {} }
  }
  const cur = readJson(localStorage.getItem(key(userId)))
  if (cur?.userId === userId && cur.version === 1) return cur
  return { version: 1, userId, byAbility: {} }
}

export function saveAbilityMasteryState(state: AbilityMasteryState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key(state.userId), JSON.stringify(state))
    window.dispatchEvent(new CustomEvent('lt-mastery-updated'))
  } catch {
    /* quota */
  }
}

export function defaultSnapshot(): AbilityProgressSnapshot {
  return {
    emaQuality: null,
    touchCount: 0,
    lastPracticedAt: null,
    scoreHistory: [],
  }
}
