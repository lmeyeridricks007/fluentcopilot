/**
 * Cross-module exam simulation types (content maps onto domain-specific banks).
 */

import type { ExamTypeId } from '@/lib/exam-session/examSessionState'

export type ExamQuestionKind = 'mcq' | 'audio_mcq' | 'video_speaking' | 'picture_speaking' | 'open_speaking' | 'writing'

/** Normalized question envelope for analytics / future unified renderer. */
export type ExamQuestion = {
  id: string
  kind: ExamQuestionKind
  examType: ExamTypeId
  order: number
  promptNl: string
  scoringWeight: number
  media?: { type: 'audio' | 'video' | 'image' | 'text'; ref: string }
  options?: { id: string; labelNl: string }[]
  correctOptionId?: string
}

export type ExamMcqAnswerRecord = {
  questionId: string
  selectedOptionId: string | null
  correct: boolean
  answeredAtMs: number
}

export type ExamSessionAnswersState = {
  byQuestionId: Record<string, ExamMcqAnswerRecord>
}
