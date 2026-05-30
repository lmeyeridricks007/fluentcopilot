import type { MistakeErrorType, MistakeEvent } from '@/lib/schemas/mistakeEvent.schema'
import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'
import type { DemoScenario } from '@/demo-data/types'
import type { A2WeakTagCount } from '@/features/curriculum/a2ReviewStore'

export type RawWeaknessSignal = {
  id: string
  weight: number
  /** Lowercase blob for matching */
  tagBlob: string
  source: 'mistake_event' | 'weak_tag' | 'last_practice' | 'skill_track_band' | 'mastery_skill'
  at: string
}

export type WeaknessCategoryDefinition = {
  id: string
  /** Tie-break when two categories get the same score */
  priority: number
  matchTags: RegExp[]
  matchErrorTypes?: MistakeErrorType[]
  /** MistakeTagger category strings e.g. word_order */
  matchMistakeCategories?: string[]
  headlines: [string, ...string[]]
  coachLine: string
  scenarioIds: string[]
  skillTrackId?: SkillTrackId
  reviewHref: string
}

export type CategoryScore = {
  categoryId: string
  score: number
  matchedSignals: RawWeaknessSignal[]
}

export type WeaknessBuilderInput = {
  scenarios: DemoScenario[]
  weakTags: A2WeakTagCount[]
  mistakeEvents: MistakeEvent[]
  /** Min best score across levels per track — when low, nudges matching category */
  skillTrackWeakestById: Partial<Record<SkillTrackId, number>>
  lastPractice: {
    tags: string[]
    scenarioId: string
    recordedAt: string
    outcome?: 'success' | 'partial' | 'needs_practice'
  } | null
  /** 1–3 from UserMastery.skillLevels */
  masterySkills?: Partial<Record<'listening' | 'speaking' | 'reading' | 'writing', number>>
  /**
   * FluentCopilot listening bursts (local profile). Down-weights `listening_fast` when the learner
   * has been doing short listening sessions without elevated fast-speech stress — avoids “fast Dutch”
   * Top focus driven only by unrelated tags like generic `gist`.
   */
  listeningBurstRelief?: {
    sessionCount: number
    /** `dimensionStress.fast_speech` from listening profile (higher = more trouble). */
    fastSpeechStress: number
  } | null
}
