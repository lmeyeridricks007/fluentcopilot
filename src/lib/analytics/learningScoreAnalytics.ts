import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { LEARNING_INTELLIGENCE_EVENTS } from '@/lib/analytics/learningIntelligenceEvents'
import { learningIntelligenceBase, type LearningModuleKey } from '@/lib/analytics/analyticsTypes'

export function trackLearningScoreProgress(
  p: {
    module: LearningModuleKey
    metric_key: string
    value: number
    attempt_index?: number
    previous_value?: number | null
    delta?: number | null
    best_value?: number | null
    first_value?: number | null
    unit_id?: string
    step_key?: string
    exam_mode?: string
    pass?: boolean
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.learning_score_progress, {
    ...learningIntelligenceBase('learning_score'),
    ...p,
  })
}
