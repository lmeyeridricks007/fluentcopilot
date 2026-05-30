'use client'

import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { Tier } from '@/features/entitlements/EntitlementContext'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type { PracticeFeedbackSideEffects } from '@/lib/practice-feedback/types'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import {
  recordPracticeScenarioComplete,
  getRetentionUserId,
} from '@/lib/retention/retentionService'
import { recordAbilityScenarioSignal } from '@/lib/mastery/recordAbilitySignals'
import { applyPracticeUnlocks } from '@/lib/practice-progress/practiceUnlockService'
import {
  collectAbilityImprovementHighlights,
  snapshotAbilityBandsForScenario,
} from '@/lib/practice-progress/practiceAbilityIntegration'
import { detectPracticeMilestones } from '@/lib/practice-progress/practiceMilestoneService'
import type {
  PracticeProgressHighlight,
  PracticeScenarioCompletionResult,
  PracticeUnlockHighlight,
  PracticeMasteryHighlight,
} from '@/lib/practice-progress/types'
import type { MilestoneHit } from '@/lib/retention/types'
import { writePracticeCompletionUi } from '@/lib/practice-progress/practiceProgressUiStorage'

export type { PracticeCompletionUiPayload } from '@/lib/practice-progress/practiceProgressUiStorage'
export { readPracticeCompletionUi, clearPracticeCompletionUi } from '@/lib/practice-progress/practiceProgressUiStorage'

function buildHighlights(input: {
  xpGained: number
  streakExtended: boolean
  countsTowardStreak: boolean
  streak: number
  unlocks: PracticeUnlockHighlight[]
  mastery: PracticeMasteryHighlight[]
  retentionMilestones: MilestoneHit[]
  practiceMilestones: MilestoneHit[]
}): PracticeProgressHighlight[] {
  const out: PracticeProgressHighlight[] = []
  if (input.xpGained > 0) {
    out.push({
      id: 'xp',
      tone: 'primary',
      title: `+${input.xpGained} XP`,
      body: 'Logged to your journey — meaningful practice only.',
    })
  }
  if (input.countsTowardStreak) {
    out.push({
      id: 'streak',
      tone: 'success',
      title: input.streakExtended ? 'Streak extended' : 'Practice counted today',
      body: input.streakExtended
        ? `You’re on a ${input.streak} day streak — keep the rhythm.`
        : 'You already practiced today; your streak stays safe.',
    })
  }
  for (const u of input.unlocks.slice(0, 1)) {
    out.push({
      id: `unlock-${u.kind}`,
      tone: 'primary',
      title: u.title,
      body: u.body,
    })
  }
  for (const m of input.mastery.slice(0, 1)) {
    out.push({
      id: `mastery-${m.abilityId}`,
      tone: 'success',
      title: m.title,
      body: m.body,
    })
  }
  const pm = input.practiceMilestones[0]
  if (pm && out.length < 3) {
    out.push({
      id: pm.id,
      tone: 'neutral',
      title: pm.title,
      body: pm.body,
    })
  }
  const rm = input.retentionMilestones[0]
  if (rm && out.length < 3 && rm.id !== pm?.id) {
    out.push({
      id: rm.id,
      tone: 'neutral',
      title: rm.title,
      body: rm.body,
    })
  }
  return out.slice(0, 3)
}

/**
 * Single entry for scenario conversation completion: unlocks → retention → mastery → milestones → UI payload.
 */
export function processPracticeScenarioCompletion(input: {
  scenarioId: string
  mode: PracticeConversationMode
  outcome: SessionOutcome
  confidencePercent: number
  tier: Tier
  sideEffects: PracticeFeedbackSideEffects
}): PracticeScenarioCompletionResult {
  const userId = getRetentionUserId()
  const { scenarioId, mode, outcome, confidencePercent, tier, sideEffects } = input

  const unlocks = applyPracticeUnlocks({
    scenarioId,
    mode,
    outcome,
    confidencePercent,
    userTurnCount: sideEffects.userTurnCount,
    tier,
  })

  const bandsBefore = snapshotAbilityBandsForScenario(userId, scenarioId)

  const meta = recordPracticeScenarioComplete({
    userId,
    scenarioId,
    mode,
    outcome,
    xpAmount: sideEffects.xpAmount,
    qualifiesStreak: sideEffects.qualifiesStreak,
  })

  recordAbilityScenarioSignal({ userId, scenarioId, outcome })

  const masteryHighlights = collectAbilityImprovementHighlights(userId, scenarioId, bandsBefore)
  for (const m of masteryHighlights) {
    track(ANALYTICS_EVENTS.practice_ability_upgraded, {
      abilityId: m.abilityId,
      scenarioId,
    })
    if (m.fromBand && m.toBand) {
      track(ANALYTICS_EVENTS.ability_state_changed, {
        ability_id: m.abilityId,
        ability_state_from: m.fromBand,
        ability_state_to: m.toBand,
        scenarioId,
        source: 'practice_scenario',
      })
    }
  }

  const practiceMilestones = detectPracticeMilestones({
    scenarioId,
    mode,
    outcome,
    userTurnCount: sideEffects.userTurnCount,
  })

  const streakMessage =
    sideEffects.qualifiesStreak && meta.streakExtended
      ? `Your ${meta.streak} day streak continues.`
      : sideEffects.qualifiesStreak
        ? 'Practice counted toward your daily habit.'
        : null

  const highlights = buildHighlights({
    xpGained: meta.xpGained,
    streakExtended: meta.streakExtended,
    countsTowardStreak: sideEffects.qualifiesStreak,
    streak: meta.streak,
    unlocks,
    mastery: masteryHighlights,
    retentionMilestones: meta.milestones,
    practiceMilestones,
  })

  writePracticeCompletionUi({
    scenarioId,
    xpGained: meta.xpGained,
    streakExtended: meta.streakExtended,
    countsTowardStreak: sideEffects.qualifiesStreak,
    streakMessage,
    highlights,
    retentionMilestones: meta.milestones,
    practiceMilestones,
    unlocks,
    masteryHighlights,
  })

  track(ANALYTICS_EVENTS.practice_session_completed, {
    scenarioId,
    mode,
    outcome,
    xpGained: meta.xpGained,
    streakExtended: meta.streakExtended,
    qualifiesStreak: sideEffects.qualifiesStreak,
    unlockCount: unlocks.length,
    masteryBumpCount: masteryHighlights.length,
  })

  return {
    xpGained: meta.xpGained,
    streak: meta.streak,
    streakExtended: meta.streakExtended,
    countsTowardStreak: sideEffects.qualifiesStreak,
    streakMessage,
    unlocks,
    masteryHighlights,
    milestones: [...meta.milestones, ...practiceMilestones],
    highlights,
  }
}
