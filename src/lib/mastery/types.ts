import type { PracticeLifeArea } from '@/lib/schemas/practice/practiceShared.schema'
import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'

/** UI grouping for the mastery map */
export type AbilityMapGroupId =
  | 'daily_life'
  | 'work'
  | 'health'
  | 'admin'
  | 'social'
  | 'recovery'
  | 'other'

export type PracticalAbilityDefinition = {
  id: string
  title: string
  description: string
  mapGroup: AbilityMapGroupId
  lifeArea: PracticeLifeArea
  /** Demo scenario ids that train this ability */
  scenarioIds: string[]
  /** Skill tracks that reinforce this ability */
  skillTrackIds: SkillTrackId[]
  /** Weakness category ids that drag confidence when active */
  weaknessCategoryIds: string[]
}

export type MasteryMapBuildInput = {
  userId: string
  /** XP ledger for scenario completion counts */
  practiceScenarioLedgerRefs: string[]
  completedLessonIds: string[]
  topWeaknessCategoryIds: string[]
  /** Min best score per track — from skill track progress */
  skillTrackWeakestById: Partial<Record<SkillTrackId, number>>
}
