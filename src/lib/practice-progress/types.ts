import type { Tier } from '@/features/entitlements/EntitlementContext'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import type { MilestoneHit } from '@/lib/retention/types'
import type { AbilityMasteryBand } from '@/lib/schemas/practice/abilityMasteryState.schema'

/** Meaningful scenario session — drives XP/streak when true */
export type ScenarioRewardSignals = {
  mode: PracticeConversationMode
  sessionOutcome: SessionOutcome
  userTurnCount: number
  supportHeavy: boolean
}

export type PracticeUnlockHighlight = {
  kind: 'mode' | 'scenario' | 'free_conversation'
  title: string
  body: string
  scenarioId?: string
}

export type PracticeMasteryHighlight = {
  abilityId: string
  title: string
  body: string
  /** Populated when band improves — for `ability_state_changed` analytics */
  fromBand?: AbilityMasteryBand
  toBand?: AbilityMasteryBand
}

export type PracticeProgressHighlight = {
  id: string
  tone: 'primary' | 'success' | 'neutral'
  title: string
  body: string
}

export type PracticeScenarioCompletionInput = {
  scenarioId: string
  mode: PracticeConversationMode
  outcome: SessionOutcome
  /** From feedback presenter — used for unlocks & milestones */
  confidencePercent: number
  tier: Tier
  /** Precomputed side effects (review queue, tags, XP hints) */
  userTurnCount: number
  supportHeavy: boolean
  xpAmount: number
  qualifiesStreak: boolean
}

export type PracticeScenarioCompletionResult = {
  xpGained: number
  streak: number
  streakExtended: boolean
  countsTowardStreak: boolean
  streakMessage: string | null
  unlocks: PracticeUnlockHighlight[]
  masteryHighlights: PracticeMasteryHighlight[]
  milestones: MilestoneHit[]
  /** Top 2 lines for completion UI — avoid noise */
  highlights: PracticeProgressHighlight[]
}

export type SkillTrackCompletionProgressInput = {
  trackId: string
  levelIndex: number
  score: number
  passed: boolean
  xpAmount: number
}

export type SkillTrackCompletionProgressResult = {
  xpGained: number
  streak: number
  streakExtended: boolean
  highlights: PracticeProgressHighlight[]
  milestones: MilestoneHit[]
}
