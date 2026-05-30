import {
  trackLearningUnitCompleted,
  trackLearningUnitStarted,
} from '@/lib/analytics/learningFlowAnalytics'
import type { LearningModuleKey, LearningSurfaceKey } from '@/lib/analytics/analyticsTypes'

/** Speaking / writing / listening / reading / KMN exam-prep units — thin convenience wrappers. */
export function trackExamPrepUnitStarted(input: {
  unit_kind: string
  unit_id: string
  module: LearningModuleKey
  surface: LearningSurfaceKey
  exam_mode?: string
  difficulty?: string
  step_total?: number
  extra?: Record<string, unknown>
}): void {
  trackLearningUnitStarted({
    unit_kind: input.unit_kind,
    unit_id: input.unit_id,
    module: input.module,
    surface: input.surface,
    exam_mode: input.exam_mode,
    difficulty: input.difficulty,
    step_total: input.step_total,
    ...(input.extra ?? {}),
  })
}

export function trackExamPrepUnitCompleted(input: {
  unit_kind: string
  unit_id: string
  module: LearningModuleKey
  surface: LearningSurfaceKey
  exam_mode?: string
  duration_ms?: number
  step_total?: number
  step_completed_count?: number
  score_summary?: number
  outcome?: string
  extra?: Record<string, unknown>
}): void {
  trackLearningUnitCompleted({
    unit_kind: input.unit_kind,
    unit_id: input.unit_id,
    module: input.module,
    surface: input.surface,
    exam_mode: input.exam_mode,
    duration_ms: input.duration_ms,
    step_total: input.step_total,
    step_completed_count: input.step_completed_count,
    score_summary: input.score_summary,
    outcome: input.outcome,
    ...(input.extra ?? {}),
  })
}
