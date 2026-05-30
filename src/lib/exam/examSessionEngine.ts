/**
 * Pure helpers for MCQ-style exam session progression (optional; domain hooks may inline).
 */
import type { ExamMcqAnswerRecord, ExamSessionAnswersState } from '@/lib/exam/examTypes'

export function initAnswerState(): ExamSessionAnswersState {
  return { byQuestionId: {} }
}

export function recordMcqAnswer(
  state: ExamSessionAnswersState,
  rec: ExamMcqAnswerRecord
): ExamSessionAnswersState {
  return {
    byQuestionId: { ...state.byQuestionId, [rec.questionId]: rec },
  }
}

export function countCorrectAnswers(state: ExamSessionAnswersState): number {
  return Object.values(state.byQuestionId).filter((r) => r.correct).length
}
