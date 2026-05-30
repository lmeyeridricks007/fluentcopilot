import { abilitiesTouchingScenario } from '@/lib/mastery/abilityMapper'
import { scoreToMasteryBand } from '@/lib/mastery/abilityScorer'
import { defaultSnapshot, loadAbilityMasteryState } from '@/lib/mastery/abilityMasteryStorage'
import type { AbilityMasteryBand } from '@/lib/schemas/practice/abilityMasteryState.schema'
import type { PracticeMasteryHighlight } from '@/lib/practice-progress/types'
import { getRetentionUserId } from '@/lib/retention/retentionService'

function bandFromEma(ema: number | null | undefined): AbilityMasteryBand {
  const v = typeof ema === 'number' && !Number.isNaN(ema) ? ema : 0.38
  return scoreToMasteryBand(v)
}

function bandRank(b: AbilityMasteryBand): number {
  if (b === 'weak') return 0
  if (b === 'improving') return 1
  return 2
}

/**
 * Compare practical-ability EMA bands before vs after `recordAbilityScenarioSignal` (caller runs signal first).
 */
export function collectAbilityImprovementHighlights(
  userId: string,
  scenarioId: string,
  bandsBefore: Map<string, AbilityMasteryBand>
): PracticeMasteryHighlight[] {
  const state = loadAbilityMasteryState(userId)
  const out: PracticeMasteryHighlight[] = []
  const defs = abilitiesTouchingScenario(scenarioId)
  for (const def of defs) {
    const prev = bandsBefore.get(def.id) ?? 'weak'
    const snap = state.byAbility[def.id] ?? defaultSnapshot()
    const next = bandFromEma(snap.emaQuality)
    if (bandRank(next) > bandRank(prev)) {
      out.push({
        abilityId: def.id,
        fromBand: prev,
        toBand: next,
        title: `${def.title} — ${next === 'strong' ? 'stronger' : 'improving'}`,
        body:
          next === 'strong'
            ? 'Your recent practice in this area is showing up as stronger real-life readiness.'
            : 'Keep short reps like this — your practical confidence is moving in the right direction.',
      })
    }
  }
  return out
}

export function snapshotAbilityBandsForScenario(
  userId: string = getRetentionUserId(),
  scenarioId: string
): Map<string, AbilityMasteryBand> {
  const state = loadAbilityMasteryState(userId)
  const map = new Map<string, AbilityMasteryBand>()
  for (const def of abilitiesTouchingScenario(scenarioId)) {
    const snap = state.byAbility[def.id] ?? defaultSnapshot()
    map.set(def.id, bandFromEma(snap.emaQuality))
  }
  return map
}
