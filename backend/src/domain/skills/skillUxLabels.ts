import type { SkillConfidence, SkillState, SkillTrend } from './skillTypes'

export type SkillTrendUserLabel = 'improving' | 'steady' | 'slipping' | 'not enough data'

export function skillTrendUserLabel(
  trend: SkillTrend,
  evidenceCount: number,
  confidence: SkillConfidence,
): SkillTrendUserLabel {
  if (trend === 'unstable' || evidenceCount < 4 || confidence === 'low') {
    return 'not enough data'
  }
  if (trend === 'up') return 'improving'
  if (trend === 'down') return 'slipping'
  return 'steady'
}

export function skillStateUserLabel(state: SkillState): string {
  switch (state) {
    case 'needs_work':
      return 'Needs work'
    case 'building':
      return 'Building'
    case 'improving':
      return 'Improving'
    case 'solid':
      return 'Solid'
    case 'strong':
      return 'Strong'
    default:
      return 'Building'
  }
}
