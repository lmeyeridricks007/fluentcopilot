import type { ScenarioRewardSignals } from '@/lib/practice-progress/types'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import {
  XP_PRACTICE_SCENARIO_MAX,
  XP_PRACTICE_SCENARIO_MIN,
} from '@/lib/retention/constants'

const MIN_USER_TURNS_FOR_FULL_CREDIT = 2

/**
 * Streak: meaningful communicative practice — at least two user turns and not a drop-out outcome.
 */
export function practiceQualifiesForStreak(signals: ScenarioRewardSignals): boolean {
  if (signals.userTurnCount < MIN_USER_TURNS_FOR_FULL_CREDIT) return false
  if (signals.sessionOutcome === 'needs_practice') return false
  return true
}

/**
 * XP scales with outcome and mode; support-heavy partial sessions are slightly reduced.
 */
export function calculateScenarioXp(signals: ScenarioRewardSignals): number {
  const { sessionOutcome: o, mode, supportHeavy } = signals
  let xp = 14
  if (o === 'success') xp = 22
  if (o === 'needs_practice') xp = 10
  if (mode === 'semi_guided') xp += 2
  if (mode === 'free') xp += 4
  if (mode === 'guided') xp += 1
  if (supportHeavy && o !== 'success') xp -= 3
  return Math.max(XP_PRACTICE_SCENARIO_MIN, Math.min(XP_PRACTICE_SCENARIO_MAX, xp))
}

/** Merge calculator with any authored override from feedback pipeline */
export function resolveScenarioXpAmount(
  signals: ScenarioRewardSignals,
  precomputedXp?: number
): number {
  const calc = calculateScenarioXp(signals)
  if (typeof precomputedXp !== 'number' || Number.isNaN(precomputedXp)) return calc
  return Math.max(XP_PRACTICE_SCENARIO_MIN, Math.min(XP_PRACTICE_SCENARIO_MAX, precomputedXp))
}

export function buildRewardSignals(
  mode: PracticeConversationMode,
  sessionOutcome: SessionOutcome,
  userTurnCount: number,
  supportHeavy: boolean
): ScenarioRewardSignals {
  return { mode, sessionOutcome, userTurnCount, supportHeavy }
}
