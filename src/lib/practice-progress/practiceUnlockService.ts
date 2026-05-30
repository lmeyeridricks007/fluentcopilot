import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import type { Tier } from '@/features/entitlements/EntitlementContext'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import type { PracticeUnlockHighlight } from '@/lib/practice-progress/types'
import {
  markSemiScenarioComplete,
  markFreeModeUnlockedByPractice,
  hasPracticeUnlockedFreeMode,
  recordQualifyingScenarioSuccess,
  addPracticeUnlockedScenario,
  isPracticeUnlockedScenario,
} from '@/lib/practice/scenarioProgressStorage'

const MIN_SEMI_TURNS_FOR_FREE_UNLOCK = 2
const MIN_CONFIDENCE_PARTIAL_FREE = 54
const SUCCESSFUL_OUTCOMES: SessionOutcome[] = ['success', 'partial']

/** After N distinct successful scenarios, premium-only catalog rows can open for free users who earned them */
const BREADTH_UNLOCK_THRESHOLD = 3
const BREADTH_UNLOCK_SCENARIO_ID = 'work'

function isPremiumish(tier: Tier): boolean {
  return tier === 'premium' || tier === 'trial'
}

function qualifiesSemiForFreeUnlock(
  outcome: SessionOutcome,
  confidencePercent: number,
  userTurnCount: number
): boolean {
  if (userTurnCount < MIN_SEMI_TURNS_FOR_FREE_UNLOCK) return false
  if (outcome === 'success') return true
  if (outcome === 'partial' && confidencePercent >= MIN_CONFIDENCE_PARTIAL_FREE) return true
  return false
}

function qualifiesCatalogSuccess(outcome: SessionOutcome, userTurnCount: number): boolean {
  if (userTurnCount < MIN_SEMI_TURNS_FOR_FREE_UNLOCK) return false
  return SUCCESSFUL_OUTCOMES.includes(outcome)
}

/**
 * Persist practice-driven unlocks after a qualifying conversation session.
 */
export function applyPracticeUnlocks(input: {
  scenarioId: string
  mode: PracticeConversationMode
  outcome: SessionOutcome
  confidencePercent: number
  userTurnCount: number
  tier: Tier
}): PracticeUnlockHighlight[] {
  if (typeof window === 'undefined') return []
  const { scenarioId, mode, outcome, confidencePercent, userTurnCount, tier } = input
  const highlights: PracticeUnlockHighlight[] = []
  const entry = getScenarioCatalogEntry(scenarioId)
  const title = entry?.title ?? scenarioId

  if (mode === 'semi_guided') {
    markSemiScenarioComplete(scenarioId, outcome)
  }

  if (
    mode === 'semi_guided' &&
    isPremiumish(tier) &&
    !hasPracticeUnlockedFreeMode(scenarioId) &&
    entry?.supportedModes.includes('free') &&
    qualifiesSemiForFreeUnlock(outcome, confidencePercent, userTurnCount)
  ) {
    markFreeModeUnlockedByPractice(scenarioId)
    highlights.push({
      kind: 'free_conversation',
      title: 'Free conversation unlocked',
      body: `You can now practice “${title}” with open role-play — same situation, less scaffolding.`,
      scenarioId,
    })
    track(ANALYTICS_EVENTS.practice_unlock_earned, {
      kind: 'free_mode',
      scenarioId,
    })
  }

  if (qualifiesCatalogSuccess(outcome, userTurnCount)) {
    const global = recordQualifyingScenarioSuccess(scenarioId)
    if (
      global.successfulScenarioIds.length >= BREADTH_UNLOCK_THRESHOLD &&
      !isPracticeUnlockedScenario(BREADTH_UNLOCK_SCENARIO_ID)
    ) {
      const target = getScenarioCatalogEntry(BREADTH_UNLOCK_SCENARIO_ID)
      if (target?.premiumRequirement === 'premium_only') {
        addPracticeUnlockedScenario(BREADTH_UNLOCK_SCENARIO_ID)
        highlights.push({
          kind: 'scenario',
          title: 'New scenario unlocked',
          body: `You’ve built enough conversational reps — “${target.title}” is now available.`,
          scenarioId: BREADTH_UNLOCK_SCENARIO_ID,
        })
        track(ANALYTICS_EVENTS.practice_unlock_earned, {
          kind: 'scenario_breadth',
          scenarioId: BREADTH_UNLOCK_SCENARIO_ID,
        })
      }
    }
  }

  return highlights
}

export function practiceBreadthUnlockThreshold(): number {
  return BREADTH_UNLOCK_THRESHOLD
}
