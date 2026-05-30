import type { PracticalAbilityDefinition } from '@/lib/mastery/types'
import type {
  AbilityMasteryBand,
  AbilityProgressSnapshot,
} from '@/lib/schemas/practice/abilityMasteryState.schema'
import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'

export function ledgerHitsForAbility(def: PracticalAbilityDefinition, ledgerScenarioRefs: string[]): number {
  let n = 0
  for (const sid of def.scenarioIds) {
    for (const ref of ledgerScenarioRefs) {
      if (ref === sid) n++
    }
  }
  return n
}

/**
 * Stable display score 0–1: smoothed practice + ledger history + small drags from weakness / tracks.
 */
export function computeAbilityDisplayScore(input: {
  def: PracticalAbilityDefinition
  snap: AbilityProgressSnapshot | undefined
  ledgerScenarioRefs: string[]
  topWeaknessCategoryIds: Set<string>
  skillTrackWeakestById: Partial<Record<SkillTrackId, number>>
}): number {
  const hits = ledgerHitsForAbility(input.def, input.ledgerScenarioRefs)
  const ledgerBoost = Math.min(0.34, hits * 0.042)
  const ema = input.snap?.emaQuality ?? null
  const base = ema ?? 0.36 + ledgerBoost * 0.85
  let score = ema != null ? ema * 0.74 + ledgerBoost * 0.26 : Math.min(0.55, base + ledgerBoost * 0.2)

  const weaknessHit = input.def.weaknessCategoryIds.some((w) => input.topWeaknessCategoryIds.has(w))
  if (weaknessHit) score *= 0.93

  const lows = input.def.skillTrackIds
    .map((tid) => input.skillTrackWeakestById[tid])
    .filter((v): v is number => v != null && v < 0.48)
  if (lows.length > 0) {
    const worst = Math.min(...lows)
    score -= Math.min(0.09, (0.48 - worst) * 0.15)
  }

  return Math.max(0.06, Math.min(0.98, Math.round(score * 1000) / 1000))
}

export function scoreToMasteryBand(score: number): AbilityMasteryBand {
  if (score < 0.42) return 'weak'
  if (score < 0.68) return 'improving'
  return 'strong'
}
