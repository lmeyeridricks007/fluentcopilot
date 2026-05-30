/**
 * Shared properties for the learning intelligence analytics layer.
 * All events still receive session_id, user_id, timestamp_iso from emitAnalyticsEvent.
 */

export const LI_SCHEMA_VERSION = 1 as const

/** High-level skill / product slice */
export type LearningModuleKey =
  | 'speaking'
  | 'writing'
  | 'listening'
  | 'reading'
  | 'kmn'
  | 'practice_scenario'
  | 'skill_track'
  | 'lesson'
  | 'review'
  | 'unknown'

/** Where the learner is in the product */
export type LearningSurfaceKey =
  | 'exam_prep_training'
  | 'exam_prep_simulation'
  | 'practice_exam'
  | 'practice_hub'
  | 'guided_scenario'
  | 'open_practice'
  | 'lesson_player'
  | 'review'
  | 'other'

export function learningIntelligenceBase(
  flow: string
): { li_schema_version: number; li_flow: string } {
  return { li_schema_version: LI_SCHEMA_VERSION, li_flow: flow }
}

/** Limit free-text payload size; avoid sending full learner utterances. */
export function clipAnalyticsText(s: string, max = 160): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}
