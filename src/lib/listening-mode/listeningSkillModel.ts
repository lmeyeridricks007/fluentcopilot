/**
 * Listening / comprehension skill taxonomy for FluentCopilot Listening mode.
 * Client-local profile + reports; designed to align with scenario + memory hooks later.
 */

export const LISTENING_SKILL_GROUPS = [
  'comprehension',
  'natural_speech',
  'real_world_detail',
  'conversation_readiness',
] as const

export type ListeningSkillGroup = (typeof LISTENING_SKILL_GROUPS)[number]

export const LISTENING_SUBSKILLS = [
  'gist',
  'key_details',
  'instruction_following',
  'response_readiness',
  'fast_speech',
  'reduced_speech',
  'filler_tolerance',
  'speaker_variation',
  'numbers',
  'times',
  'route_words',
  'quantities',
  'service_phrases',
  'turn_timing',
  'follow_up_questions',
  'next_action',
] as const

export type ListeningSubskill = (typeof LISTENING_SUBSKILLS)[number]

/** Dimensions persisted for personalization / weak-area drills. */
export const LISTENING_PROFILE_DIMENSIONS = [
  'gist',
  'detail_accuracy',
  'fast_speech',
  'natural_reply',
  'response_readiness',
  'numbers_times',
  'route_place',
  'replay_dependence',
  'transcript_dependence',
] as const

export type ListeningProfileDimension = (typeof LISTENING_PROFILE_DIMENSIONS)[number]

export type ListeningWeakSignal = {
  dimension: ListeningProfileDimension
  /** Higher = more urgent (0–1). */
  weight: number
  /** Human-readable coach line. */
  coachLine: string
}
