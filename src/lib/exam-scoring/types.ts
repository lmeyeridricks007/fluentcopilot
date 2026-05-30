/**
 * Exam scoring engine — types (distinct from persisted `ExamScoringResult` shape).
 */
import type { ExamMode } from '@/lib/schemas/exam/examShared.schema'
import type { ExamRubricScoreRow } from '@/lib/schemas/exam/scoringResult.schema'
import type { RubricDomainKey } from '@/lib/schemas/exam/examType.schema'

/** Product-facing readiness (not official DUO certification). */
export type ReadinessLabel = 'needs_work' | 'improving' | 'nearly_ready' | 'strong'

/** Borderline exercise outcome for UI copy. */
export type ExerciseOutcomeBand = 'fail' | 'close' | 'pass'

export type SpeakingEngineCategoryKey =
  | 'execution'
  | 'vocabulary'
  | 'grammar'
  | 'fluency'
  | 'clearness'
  | 'pronunciation'

export type WritingEngineCategoryKey =
  | 'execution'
  | 'grammar'
  | 'spelling'
  | 'clearness'
  | 'vocabulary'

export type SpeakingRawScores = Record<SpeakingEngineCategoryKey, number>

export type WritingRawScores = Record<WritingEngineCategoryKey, number>

/** Full engine output for one exercise attempt (before persistence ids injected). */
export type ExamScoringEngineOutput = {
  examType: RubricDomainKey
  mode: ExamMode
  rubricDefinitionId: string
  rubricVersion: string
  evaluatorVersion: string
  rubricScores: ExamRubricScoreRow[]
  totalScore: number
  maxScore: number
  /** Raw sum / max as 0–100 (primary product display). */
  normalizedPercent: number
  /** Derived display scale 0–10 (2 decimals). */
  tenPointScale: number
  pass: boolean
  exerciseOutcomeBand: ExerciseOutcomeBand
  readinessLabel: ReadinessLabel
  /** True when execution was 0 and dependent categories were zeroed. */
  executionGatingApplied: boolean
  /** Short rationale per engine category key. */
  categoryRationales: Partial<Record<string, string>>
  /** Tags for weakness / review / analytics (e.g. `exam-grammar`, `exam-execution`). */
  weakTags: string[]
  /** Model or rules certainty 0–1 when AI-assisted. */
  certainty?: number
  summaryComment?: string
  metadata?: Record<string, unknown>
}

export type ScoringContext = {
  mode: ExamMode
  /** Dutch transcript (speaking) or submission text (writing). */
  responseText: string
  /** Optional bullet requirements from exercise for execution checks. */
  promptSummary?: string
  /** Optional STT confidence 0–1. */
  transcriptConfidence?: number
}
