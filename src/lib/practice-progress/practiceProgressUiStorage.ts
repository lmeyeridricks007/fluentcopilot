'use client'

import type { PracticeProgressHighlight } from '@/lib/practice-progress/types'
import type { PracticeUnlockHighlight } from '@/lib/practice-progress/types'
import type { PracticeMasteryHighlight } from '@/lib/practice-progress/types'
import type { MilestoneHit } from '@/lib/retention/types'

const UI_KEY = 'lt-practice-completion-ui-v1'

export type PracticeCompletionUiPayload = {
  scenarioId: string
  xpGained: number
  streakExtended: boolean
  countsTowardStreak: boolean
  streakMessage: string | null
  highlights: PracticeProgressHighlight[]
  retentionMilestones: MilestoneHit[]
  practiceMilestones: MilestoneHit[]
  unlocks: PracticeUnlockHighlight[]
  masteryHighlights: PracticeMasteryHighlight[]
}

export function writePracticeCompletionUi(payload: PracticeCompletionUiPayload): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(UI_KEY, JSON.stringify(payload))
  } catch {
    /* quota */
  }
}

export function readPracticeCompletionUi(): PracticeCompletionUiPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(UI_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PracticeCompletionUiPayload
  } catch {
    return null
  }
}

export function clearPracticeCompletionUi(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(UI_KEY)
}
