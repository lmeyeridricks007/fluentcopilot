import { emitAnalyticsEvent } from '@/lib/analytics/analyticsService'
import { LEARNING_INTELLIGENCE_EVENTS } from '@/lib/analytics/learningIntelligenceEvents'
import { learningIntelligenceBase, type LearningModuleKey, type LearningSurfaceKey } from '@/lib/analytics/analyticsTypes'

type UnitCommon = {
  unit_kind: string
  unit_id: string
  module?: LearningModuleKey
  surface?: LearningSurfaceKey
  difficulty?: string
  exam_mode?: string
}

export function trackLearningUnitStarted(
  p: UnitCommon & {
    step_total?: number
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.learning_unit_started, {
    ...learningIntelligenceBase('learning_unit'),
    ...p,
  })
}

export function trackLearningUnitCompleted(
  p: UnitCommon & {
    duration_ms?: number
    step_total?: number
    step_completed_count?: number
    score_summary?: number
    outcome?: string
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.learning_unit_completed, {
    ...learningIntelligenceBase('learning_unit'),
    ...p,
  })
}

export function trackLearningUnitAbandoned(
  p: UnitCommon & {
    duration_ms?: number
    progress_ratio?: number
    exit_phase?: string
    step_index?: number
    step_total?: number
    abandon_reason?: 'navigation_unmount' | 'user_exit' | 'background'
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.learning_unit_abandoned, {
    ...learningIntelligenceBase('learning_unit'),
    ...p,
  })
}

export function trackLearningStepStarted(
  p: UnitCommon & {
    step_key: string
    step_index: number
    step_total: number
    question_type?: string
    task_type?: string
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.learning_step_started, {
    ...learningIntelligenceBase('learning_step'),
    ...p,
  })
}

export function trackLearningStepCompleted(
  p: UnitCommon & {
    step_key: string
    step_index: number
    step_total: number
    duration_ms?: number
    correct?: boolean
    score?: number
    input_modality?: 'voice' | 'type' | 'typing' | 'speaking' | 'unknown'
    support_actions_count?: number
    replay_count?: number
    timed_out?: boolean
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.learning_step_completed, {
    ...learningIntelligenceBase('learning_step'),
    ...p,
  })
}

export function trackLearningStepAbandoned(
  p: UnitCommon & {
    step_key: string
    step_index: number
    step_total: number
    duration_ms?: number
    abandon_reason?: string
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.learning_step_abandoned, {
    ...learningIntelligenceBase('learning_step'),
    ...p,
  })
}

export function trackInputModalitySwitched(
  p: {
    from: 'voice' | 'type' | 'speaking' | 'typing' | 'unknown'
    to: 'voice' | 'type' | 'speaking' | 'typing' | 'unknown'
    surface: string
    context_id: string
    module?: LearningModuleKey
  } & Record<string, unknown>
): void {
  emitAnalyticsEvent(LEARNING_INTELLIGENCE_EVENTS.input_modality_switched, {
    ...learningIntelligenceBase('modality'),
    ...p,
  })
}
