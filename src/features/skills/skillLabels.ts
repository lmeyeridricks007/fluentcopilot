'use client'

import type { ApiSkillConfidence, ApiSkillState, ApiSkillTrend } from '@/lib/api/apiTypes'

export function skillStateLabel(state: ApiSkillState): string {
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

export function skillTrendLabel(
  trend: ApiSkillTrend,
  evidenceCount: number,
  confidence: ApiSkillConfidence,
): 'Improving' | 'Steady' | 'Slipping' | 'Not enough data yet' {
  if (trend === 'unstable' || evidenceCount < 4 || confidence === 'low') {
    return 'Not enough data yet'
  }
  if (trend === 'up') return 'Improving'
  if (trend === 'down') return 'Slipping'
  return 'Steady'
}

export function groupTitle(group: string): string {
  switch (group) {
    case 'speaking':
      return 'Speaking'
    case 'conversation':
      return 'Conversation'
    case 'structure':
      return 'Structure'
    case 'language':
      return 'Language'
    case 'listening':
      return 'Listening'
    case 'advanced':
      return 'Advanced'
    default:
      return group
  }
}
