import type { Tier } from '@/features/entitlements/EntitlementContext'
import type { ScenarioCatalogEntry } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import { hasGuidedScenario } from '@/lib/practice/guided/guidedScenarioRegistry'
import {
  hasCompletedGuidedScenario,
  hasPracticeUnlockedFreeMode,
} from '@/lib/practice/scenarioProgressStorage'

export type ModeAccessReason =
  | 'ok'
  | 'unsupported'
  | 'needs_guided_first'
  | 'needs_premium'
  | 'needs_guided_content'
  | 'needs_semi_success_first'

export interface ModeAccessResult {
  allowed: boolean
  reason: ModeAccessReason
  /** Product copy */
  hint?: string
}

function supports(entry: ScenarioCatalogEntry, mode: PracticeConversationMode): boolean {
  return entry.supportedModes.includes(mode)
}

/**
 * Premium strategy (architecture — tune copy in UI):
 * - Guided: free + caps (handled at session start)
 * - Semi-guided: free once guided done (if guided exists); else open
 * - Free conversation: premium / trial for full open mode
 */
export function getPracticeModeAccess(
  entry: ScenarioCatalogEntry,
  mode: PracticeConversationMode,
  tier: Tier
): ModeAccessResult {
  if (!supports(entry, mode)) {
    return { allowed: false, reason: 'unsupported', hint: 'This scenario doesn’t offer this mode yet — pick another mode above.' }
  }

  if (mode === 'guided') {
    if (!hasGuidedScenario(entry.id)) {
      return {
        allowed: false,
        reason: 'needs_guided_content',
        hint: 'Scripted guided path is not available — use semi-guided or classic chat.',
      }
    }
    return { allowed: true, reason: 'ok' }
  }

  if (mode === 'semi_guided') {
    if (hasGuidedScenario(entry.id) && !hasCompletedGuidedScenario(entry.id)) {
      return {
        allowed: false,
        reason: 'needs_guided_first',
        hint: 'Complete Guided once for this scenario — then Semi-guided unlocks here.',
      }
    }
    return { allowed: true, reason: 'ok' }
  }

  if (mode === 'free') {
    if (tier !== 'premium' && tier !== 'trial') {
      return {
        allowed: false,
        reason: 'needs_premium',
        hint: 'Open conversation practice is included in Premium — or start a trial.',
      }
    }
    const freeProgressOk =
      hasPracticeUnlockedFreeMode(entry.id) || hasCompletedGuidedScenario(entry.id)
    if (!freeProgressOk) {
      return {
        allowed: false,
        reason: 'needs_semi_success_first',
        hint: 'Finish Guided once, or complete a solid Semi-guided run, to unlock Free mode for this scenario.',
      }
    }
    return { allowed: true, reason: 'ok' }
  }

  return { allowed: false, reason: 'unsupported' }
}

export function listModesForEntry(entry: ScenarioCatalogEntry): PracticeConversationMode[] {
  return entry.supportedModes
}
