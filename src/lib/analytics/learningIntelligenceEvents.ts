/**
 * Learning intelligence event names — imported by `analytics.ts` and analytics helpers
 * to avoid circular imports (`@/lib/analytics` ↔ helpers).
 */
export const LEARNING_INTELLIGENCE_EVENTS = {
  learning_unit_started: 'learning_unit_started',
  learning_unit_completed: 'learning_unit_completed',
  learning_unit_abandoned: 'learning_unit_abandoned',
  learning_step_started: 'learning_step_started',
  learning_step_completed: 'learning_step_completed',
  learning_step_abandoned: 'learning_step_abandoned',
  learning_score_progress: 'learning_score_progress',
  input_modality_switched: 'input_modality_switched',
  practice_hub_recommendation_shown: 'practice_hub_recommendation_shown',
  practice_hub_recommendation_clicked: 'practice_hub_recommendation_clicked',
  learning_loop_stage: 'learning_loop_stage',
  readiness_band_transition: 'readiness_band_transition',
} as const

export type LearningIntelligenceEventName =
  (typeof LEARNING_INTELLIGENCE_EVENTS)[keyof typeof LEARNING_INTELLIGENCE_EVENTS]
