'use client'

import type { RetentionProfile } from '@/lib/retention/types'
import { ABILITY_DEFINITIONS } from '@/lib/mastery/abilityRegistry'
import { loadAbilityMasteryState } from '@/lib/mastery/abilityMasteryStorage'
import { computeAbilityDisplayScore, scoreToMasteryBand } from '@/lib/mastery/abilityScorer'
import type { AbilityBandCounts } from '@/lib/post-a2/readinessEvaluator'
import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'
import { loadSkillTrackProgress } from '@/lib/skill-tracks/skillTrackProgressStorage'

const SKILL_TRACK_IDS: SkillTrackId[] = [
  'speaking_fluency',
  'listening_confidence',
  'reading_real_life',
  'writing_messages',
  'conversation_repair',
]

function skillTrackWeakestById(): Partial<Record<SkillTrackId, number>> {
  const out: Partial<Record<SkillTrackId, number>> = {}
  for (const id of SKILL_TRACK_IDS) {
    const row = loadSkillTrackProgress(id)
    const scores = Object.values(row.bestScoreByLevel)
    if (scores.length === 0) continue
    out[id] = Math.min(...scores)
  }
  return out
}

function practiceScenarioRefsFromLedger(profile: RetentionProfile | null): string[] {
  if (!profile?.ledger?.length) return []
  const refs: string[] = []
  for (const e of profile.ledger) {
    if (e.reason === 'practice_scenario_complete' && e.ref) refs.push(e.ref)
  }
  return refs
}

function topWeaknessIdsFromTags(weakTagRows: { tag: string; wrongCount: number }[]): Set<string> {
  const s = new Set<string>()
  for (const row of weakTagRows) {
    if (row.wrongCount >= 2) s.add(row.tag.trim())
  }
  return s
}

/**
 * Derive ability band counts for readiness (client-only; uses local persistence).
 */
export function buildAbilityBandCounts(input: {
  userId: string
  profile: RetentionProfile | null
  weakTagRows: { tag: string; wrongCount: number }[]
}): AbilityBandCounts {
  const state = loadAbilityMasteryState(input.userId)
  const ledgerRefs = practiceScenarioRefsFromLedger(input.profile)
  const weaknessSet = topWeaknessIdsFromTags(input.weakTagRows)
  const skillWeak = skillTrackWeakestById()

  let weak = 0
  let improving = 0
  let strong = 0

  for (const def of ABILITY_DEFINITIONS) {
    const snap = state.byAbility[def.id]
    const score = computeAbilityDisplayScore({
      def,
      snap,
      ledgerScenarioRefs: ledgerRefs,
      topWeaknessCategoryIds: weaknessSet,
      skillTrackWeakestById: skillWeak,
    })
    const band = scoreToMasteryBand(score)
    if (band === 'weak') weak += 1
    else if (band === 'improving') improving += 1
    else strong += 1
  }

  const total = ABILITY_DEFINITIONS.length
  return { weak, improving, strong, total }
}
