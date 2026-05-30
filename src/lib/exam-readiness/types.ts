/**
 * Exam readiness — distinct from general Dutch mastery: exam-style performance & stability.
 */
import type { ExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'

export type ExamReadinessMode = 'training' | 'simulation'

/** Stored per attempt (local persistence). */
export type ExamReadinessAttemptRecord = {
  id: string
  at: string
  module: ExamPrepTypeId
  mode: ExamReadinessMode
  /** 0–100 exam-oriented scale (MCQ uses banded proxy when no rubric). */
  normalizedPercent: number
  pass: boolean
  /** Rubric rows below threshold; listening/reading may use questionType / skill key. */
  weakRubricKeys: string[]
  /** Extra context for explanations, e.g. `listening:detail`, `kmn:healthcare` */
  facets: string[]
}

/** Internal trend for smoothing UX. */
export type ReadinessTrend = 'improving' | 'stable' | 'slipping' | 'unknown'

/** User-facing pass likelihood — not an official prediction. */
export type PassLikelihoodLabel =
  | 'likely_ready'
  | 'close_to_ready'
  | 'improving_band'
  | 'needs_more_work'
  | 'not_enough_data'

export type ReadinessStateLabel =
  | 'ready'
  | 'close'
  | 'improving'
  | 'needs_work'
  | 'needs_data'

export type ModuleReadinessModel = {
  module: ExamPrepTypeId
  headlineNl: string
  readinessScore: number | null
  state: ReadinessStateLabel
  passLikelihood: PassLikelihoodLabel
  trend: ReadinessTrend
  attemptCount: number
  /** ISO timestamp of most recent exam-prep attempt for this module; null if none. */
  lastAttemptAt: string | null
  recentPassRate: number | null
  /** Top blockers for this module, max 3 */
  weakCategories: { key: string; labelNl: string; labelEn: string }[]
  explanationNl: string
  nextHintNl: string
  recommendedHref: string
}

export type OverallReadinessModel = {
  headlineNl: string
  readinessScore: number | null
  state: ReadinessStateLabel
  passLikelihood: PassLikelihoodLabel
  trend: ReadinessTrend
  modulesWithData: number
  explanationNl: string
  nextHintNl: string
  disclaimerNl: string
}

export type ExamReadinessPresenterBundle = {
  overall: OverallReadinessModel
  modules: ModuleReadinessModel[]
  updatedAt: string | null
}
