/**
 * Submission / result payloads for unified exam reporting (extends domain aggregators).
 */
import type { ExamTypeId } from '@/lib/exam-session/examSessionState'
import type { McqPassResult } from '@/lib/exam/examScoring'

export type ExamMcqSubmissionSummary = {
  sessionId: string
  examType: ExamTypeId
  endedByTimer: boolean
  mcq: McqPassResult
}
