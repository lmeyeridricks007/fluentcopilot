import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'
import type { ExamScoringEngineOutput, ReadinessLabel } from '@/lib/exam-scoring/types'
import type { ExamScoringResult } from '@/lib/schemas/exam/scoringResult.schema'
import type { ExamAttempt } from '@/lib/schemas/exam/examAttempt.schema'
import type { FeedbackBlock } from '@/lib/schemas/exam/feedbackBlock.schema'
import type { WritingCoachOutput } from '@/lib/schemas/exam/writingCoachOutput.schema'

export type WritingTrainingPhase = 'category' | 'prompt' | 'feedback'

export type WritingTrainingFeedbackUi = {
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
    detail?: string
    learnerFeedbackNl: string
    evidenceNl?: string
  }[]
  modelAnswerDutch: string
  modelAnswerNoteEn?: string
  executionGatedNote?: string
  learnerAnswerPreview?: string
}

export type WritingTrainingEvaluationBundle = {
  item: WritingTrainingItem
  responseText: string
  fieldValues?: Record<string, string>
  engine: ExamScoringEngineOutput
  coach: WritingCoachOutput
  feedbackUi: WritingTrainingFeedbackUi
  attemptId: string
  scoringResultId: string
  scoringResult: ExamScoringResult
  feedbackBlockId: string
  feedbackBlock: FeedbackBlock
  attempt: ExamAttempt
}

/** Writing exam simulation — four tasks, feedback only after the session. */
export type WritingSimulationPhase = 'intro' | 'task' | 'report'

export type WritingSimulationTaskBundle = {
  item: WritingTrainingItem
  responseText: string
  fieldValues?: Record<string, string>
  engine: ExamScoringEngineOutput
  attemptId: string
  scoringResultId: string
  scoringResult: ExamScoringResult
  attempt: ExamAttempt
  timedOut: boolean
}
