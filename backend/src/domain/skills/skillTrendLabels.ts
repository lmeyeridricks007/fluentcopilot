/**
 * User-facing trend labels derived from internal {@link SkillTrend} + {@link SkillConfidence}.
 */
import type { SkillConfidence, SkillTrend } from './skillTypes'

export type SkillTrendUserLabel = 'improving' | 'steady' | 'slipping' | 'not_enough_data'

/**
 * Maps engine trend + confidence to a single UX-safe label.
 * - `unstable` → not enough data (ambiguous window).
 * - Low confidence + flat → not enough data; low + directional → soft directional label.
 */
export function trendToUserFacingLabel(trend: SkillTrend, confidence: SkillConfidence): SkillTrendUserLabel {
  if (trend === 'unstable') return 'not_enough_data'
  if (confidence === 'low') {
    if (trend === 'flat') return 'not_enough_data'
    if (trend === 'up') return 'improving'
    if (trend === 'down') return 'slipping'
    return 'not_enough_data'
  }
  if (trend === 'up') return 'improving'
  if (trend === 'down') return 'slipping'
  return 'steady'
}
