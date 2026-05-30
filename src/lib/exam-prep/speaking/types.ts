import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type { ExamScoringEngineOutput, ReadinessLabel } from '@/lib/exam-scoring/types'
import type { ExamScoringResult } from '@/lib/schemas/exam/scoringResult.schema'
import type { ExamAttempt } from '@/lib/schemas/exam/examAttempt.schema'
import type { FeedbackBlock } from '@/lib/schemas/exam/feedbackBlock.schema'
import type { SpeakingCoachOutput } from '@/lib/schemas/exam/speakingCoachOutput.schema'

/** Single-question phases; multi-session adds intro, compact, summary */
export type SpeakingTrainingPhase =
  | 'intro'
  | 'prompt'
  | 'input'
  | 'question_compact'
  | 'session_summary'

export type SpeakingInputMode = 'voice' | 'type'

export type SpeakingTrainingFeedbackUi = {
  headline: string
  subline: string
  readinessLabel: ReadinessLabel
  normalizedPercent: number
  tenPointScale: number
  pass: boolean
  strengths: string[]
  improvements: string[]
  categoryRows: {
    key: string
    label: string
    labelNl: string
    score: number
    max: number
    /** Engine / evaluator rationale (often aligns with rubric). */
    detail?: string
    /** Primary Dutch feedback for the learner for this category. */
    learnerFeedbackNl: string
    evidenceNl?: string
  }[]
  modelAnswerDutch: string
  modelAnswerNoteEn?: string
  executionGatedNote?: string
  /** Optional short quote of learner answer on result screen. */
  learnerAnswerPreview?: string
}

export type SpeakingTrainingEvaluationBundle = {
  item: SpeakingTrainingItem
  responseText: string
  inputMode: SpeakingInputMode
  transcriptConfidence?: number
  engine: ExamScoringEngineOutput
  /** Exam-coach copy: categories, corrections, improved + ideal text. */
  coach: SpeakingCoachOutput
  feedbackUi: SpeakingTrainingFeedbackUi
  attemptId: string
  scoringResultId: string
  scoringResult: ExamScoringResult
  feedbackBlockId: string
  feedbackBlock: FeedbackBlock
  /** Runtime `ExamAttempt` (client); embed `scoringResult` when persisting. */
  attempt: ExamAttempt
}

/** Speaking exam simulation — no coach layer; feedback only after the session. */
export type SpeakingSimulationPhase = 'intro' | 'question' | 'report'

export type SpeakingSimulationQuestionBundle = {
  item: SpeakingTrainingItem
  responseText: string
  inputMode: SpeakingInputMode
  transcriptConfidence?: number
  engine: ExamScoringEngineOutput
  attemptId: string
  scoringResultId: string
  scoringResult: ExamScoringResult
  attempt: ExamAttempt
  timedOut: boolean
}
