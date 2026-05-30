import type { OnboardingData } from '@/store/onboardingStore'
import type { StartPathwayKey } from './types'

/**
 * Priority (deterministic):
 * 1. Explicit `targetPath` from the pathway step — always wins when set.
 * 2. Primary goal strongly aligned with exam → exam prep.
 * 3. Learning reason exam / visa → exam prep.
 * 4. Confidence- or speaking-first goals / reason → practice hub.
 * 5. Default → A2 curriculum (Learn).
 */
export function mapOnboardingSignalsToPathway(data: Partial<OnboardingData>): {
  pathwayKey: StartPathwayKey
  decisionTrace: string
} {
  const tp = typeof data.targetPath === 'string' ? data.targetPath.trim() : ''

  if (tp === 'exam_prep') {
    return { pathwayKey: 'exam_prep', decisionTrace: 'priority_1:target_path:exam_prep' }
  }
  if (tp === 'a2_mastery') {
    return { pathwayKey: 'practice_confidence', decisionTrace: 'priority_1:target_path:a2_mastery' }
  }
  if (tp === 'a2') {
    return { pathwayKey: 'a2_curriculum', decisionTrace: 'priority_1:target_path:a2' }
  }
  if (tp === 'b1') {
    return { pathwayKey: 'b1_dashboard', decisionTrace: 'priority_1:target_path:b1' }
  }

  if (data.primaryGoal === 'exam_inburgering') {
    return { pathwayKey: 'exam_prep', decisionTrace: 'priority_2:primary_goal:exam_inburgering' }
  }

  if (data.learningReason === 'exam_visa') {
    return { pathwayKey: 'exam_prep', decisionTrace: 'priority_3:learning_reason:exam_visa' }
  }

  if (
    data.primaryGoal === 'confidence_b1' ||
    data.primaryGoal === 'speaking_more' ||
    data.learningReason === 'confidence'
  ) {
    return { pathwayKey: 'practice_confidence', decisionTrace: 'priority_4:confidence_or_speaking_signal' }
  }

  if (data.primaryGoal === 'everyday_dutch' && data.focusSkills?.includes('speaking')) {
    return {
      pathwayKey: 'practice_confidence',
      decisionTrace: 'priority_4b:focus_speaking+everyday_goal',
    }
  }

  if (tp !== '') {
    return { pathwayKey: 'fallback_learn', decisionTrace: `priority_5:unknown_target_path:${tp}` }
  }

  return { pathwayKey: 'a2_curriculum', decisionTrace: 'priority_6:fallback_default_a2_curriculum' }
}

export function pathwayKeyToRoute(key: StartPathwayKey): string {
  switch (key) {
    case 'exam_prep':
      return '/app/exam-prep'
    case 'practice_confidence':
      return '/app/talk'
    case 'a2_curriculum':
    case 'fallback_learn':
      return '/app/library'
    case 'b1_dashboard':
      return '/app/talk'
    default:
      return '/app/library'
  }
}
