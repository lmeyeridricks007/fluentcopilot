/**
 * Personalization Engine — adaptive difficulty based on performance and confidence.
 */

import type { CEFRLevel } from '../types/profile.js'
import type { SkillState } from '../types/skills.js'
import type { ProgressSnapshot } from '../types/progress.js'

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']

export type DifficultyAdjustment = 'increase' | 'maintain' | 'decrease' | 'review'

export interface DifficultyRecommendation {
  suggested_level: CEFRLevel
  adjustment: DifficultyAdjustment
  reason: string
}

export function getDifficultyRecommendation(
  currentLevel: CEFRLevel,
  recentAccuracy: number,
  confidence: number,
  _progress?: ProgressSnapshot | null
): DifficultyRecommendation {
  if (recentAccuracy >= 0.85 && confidence >= 0.5) {
    const idx = CEFR_ORDER.indexOf(currentLevel)
    if (idx < CEFR_ORDER.length - 1) {
      return {
        suggested_level: CEFR_ORDER[idx + 1],
        adjustment: 'increase',
        reason: 'High accuracy and confidence; try next level',
      }
    }
    return {
      suggested_level: currentLevel,
      adjustment: 'maintain',
      reason: 'Strong performance at current level',
    }
  }
  if (recentAccuracy < 0.5 || confidence < 0.2) {
    const idx = CEFR_ORDER.indexOf(currentLevel)
    if (idx > 0) {
      return {
        suggested_level: CEFR_ORDER[idx - 1],
        adjustment: 'decrease',
        reason: 'Recommend review at slightly lower level',
      }
    }
    return {
      suggested_level: currentLevel,
      adjustment: 'review',
      reason: 'Focus on review and consolidation',
    }
  }
  return {
    suggested_level: currentLevel,
    adjustment: 'maintain',
    reason: 'Continue at current level',
  }
}

export function aggregateRecentPerformance(skills: Record<string, SkillState>): number {
  const states = Object.values(skills).filter((s) => s.sample_count > 0)
  if (states.length === 0) return 0.5
  return states.reduce((a, s) => a + s.recent_performance, 0) / states.length
}
