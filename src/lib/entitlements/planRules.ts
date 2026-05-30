import type { BetaPlanId } from './planTypes'
import type { FeatureKey } from './featureKeys'

/**
 * Premium-only capabilities. Basic keeps core Learn + scenario library + exam landing preview.
 */
const PREMIUM_ONLY = new Set<FeatureKey>([
  'exam_prep_modules',
  'exam_practice_exams',
  'practice_skill_tracks',
  'practice_simulation',
  'practice_voice_tutor',
  'practice_pronunciation',
  'practice_open_conversation',
  'insights_readiness_detail',
  'premium_lesson_content',
])

export function canAccessFeature(plan: BetaPlanId, key: FeatureKey): boolean {
  if (plan === 'premium') return true
  return !PREMIUM_ONLY.has(key)
}

export function getPremiumOnlyFeatures(): readonly FeatureKey[] {
  return [...PREMIUM_ONLY]
}
