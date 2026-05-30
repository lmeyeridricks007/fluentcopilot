import { ABILITY_DEFINITIONS } from '@/lib/mastery/abilityRegistry'
import type { PracticalAbilityDefinition } from '@/lib/mastery/types'
import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'

export function abilitiesTouchingScenario(scenarioId: string): PracticalAbilityDefinition[] {
  return ABILITY_DEFINITIONS.filter((a) => a.scenarioIds.includes(scenarioId))
}

export function abilitiesTouchingSkillTrack(trackId: SkillTrackId): PracticalAbilityDefinition[] {
  return ABILITY_DEFINITIONS.filter((a) => a.skillTrackIds.includes(trackId))
}
