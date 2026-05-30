export { ABILITY_DEFINITIONS, getAbilityDefinition } from '@/lib/mastery/abilityRegistry'
export { abilitiesTouchingScenario, abilitiesTouchingSkillTrack } from '@/lib/mastery/abilityMapper'
export {
  loadAbilityMasteryState,
  saveAbilityMasteryState,
  defaultSnapshot,
} from '@/lib/mastery/abilityMasteryStorage'
export {
  recordAbilityScenarioSignal,
  recordAbilitySkillTrackSignal,
  recordAbilityExamSessionSignal,
  recordAbilityReviewSignal,
} from '@/lib/mastery/recordAbilitySignals'
export { buildMasteryMapViewModel, buildAbilityDetailViewModel } from '@/lib/mastery/masteryPresenterModel'
export type { AbilityCardVm, MasteryMapViewModel, AbilityDetailVm } from '@/lib/mastery/masteryPresenterModel'
export type { PracticalAbilityDefinition, AbilityMapGroupId } from '@/lib/mastery/types'
