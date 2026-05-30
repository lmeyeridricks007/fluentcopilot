/**
 * Central feature identifiers for plan gating.
 * Add keys here before using `canAccessFeature`.
 */
export const FEATURE_KEYS = [
  'exam_prep_modules',
  'exam_practice_exams',
  'practice_skill_tracks',
  'practice_simulation',
  'practice_voice_tutor',
  'practice_pronunciation',
  'practice_open_conversation',
  'insights_readiness_detail',
  'premium_lesson_content',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

export function isFeatureKey(s: string): s is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(s)
}
