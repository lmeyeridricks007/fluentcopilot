import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { LEARNING_INTELLIGENCE_EVENTS } from '@/lib/analytics/learningIntelligenceEvents'
import { learningIntelligenceBase } from '@/lib/analytics/analyticsTypes'

export type LearningLoopStage =
  | 'mistake_extracted'
  | 'review_item_created'
  | 'weakness_updated'
  | 'recommendation_emitted'
  | 'retry_started'
  | 'retry_completed'
  | 'improvement_observed'

export function trackLearningLoopStage(
  stage: LearningLoopStage,
  p: Record<string, unknown> = {}
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.learning_loop_stage, {
    ...learningIntelligenceBase('learning_loop'),
    loop_stage: stage,
    ...p,
  })
}
