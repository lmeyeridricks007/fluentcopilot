/**
 * Fixed Practice Exams — mock-exam layer (distinct from drills + free simulation draws).
 */
import type { ExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'

export const PRACTICE_EXAM_CONTENT_VERSION = 1 as const

export type PracticeExamModule = ExamPrepTypeId

/** Stable product id, e.g. speaking-pe-1 */
export type PracticeExamSetId = string

export type SpeakingPracticeExamSetDef = {
  id: PracticeExamSetId
  module: 'speaking'
  version: typeof PRACTICE_EXAM_CONTENT_VERSION
  ordinal: number
  titleNl: string
  subtitleNl: string
  estimatedMinutes: number
  /** @deprecated Full DUO 2025-length exam uses seeded draws; ids ignored if absent. */
  speakingQuestionIds?: readonly [string, string, string, string]
}

export type WritingPracticeExamSetDef = {
  id: PracticeExamSetId
  module: 'writing'
  version: typeof PRACTICE_EXAM_CONTENT_VERSION
  ordinal: number
  titleNl: string
  subtitleNl: string
  estimatedMinutes: number
  writingTaskIds: [string, string, string, string]
}

export type ListeningPracticeExamSetDef = {
  id: PracticeExamSetId
  module: 'listening'
  version: typeof PRACTICE_EXAM_CONTENT_VERSION
  ordinal: number
  titleNl: string
  subtitleNl: string
  estimatedMinutes: number
  /** @deprecated DUO-length exam uses bank cycling; optional for legacy. */
  listeningTaskIds?: string[]
}

export type ReadingPracticeExamSetDef = {
  id: PracticeExamSetId
  module: 'reading'
  version: typeof PRACTICE_EXAM_CONTENT_VERSION
  ordinal: number
  titleNl: string
  subtitleNl: string
  estimatedMinutes: number
  /** @deprecated DUO 25-vragen exam uses bank cycling; optional for legacy. */
  readingTaskIds?: string[]
}

export type KmnPracticeExamSetDef = {
  id: PracticeExamSetId
  module: 'kmn'
  version: typeof PRACTICE_EXAM_CONTENT_VERSION
  ordinal: number
  titleNl: string
  subtitleNl: string
  estimatedMinutes: number
  /** @deprecated ~40-vragen exam uses full bank cycle; optional for legacy. */
  kmnQuizQuestionIds?: string[]
}

export type PracticeExamSetDef =
  | SpeakingPracticeExamSetDef
  | WritingPracticeExamSetDef
  | ListeningPracticeExamSetDef
  | ReadingPracticeExamSetDef
  | KmnPracticeExamSetDef

export type PracticeExamAttemptStored = {
  id: string
  setId: PracticeExamSetId
  module: PracticeExamModule
  contentVersion: number
  sessionId: string
  startedAt: string
  completedAt: string
  /** 0–100 aggregate */
  averagePercent: number
  /** 0–1 share of items passed / correct */
  passedRatio: number
  taskCount: number
  /** Optional payload for future compare UI */
  meta?: Record<string, unknown>
}

export type PracticeExamProgressSnapshot = {
  setId: PracticeExamSetId
  attemptCount: number
  lastAttempt: PracticeExamAttemptStored | null
  bestAttempt: PracticeExamAttemptStored | null
  bestPercent: number | null
  lastPercent: number | null
}

export type PracticeExamCompareDelta = 'improved' | 'stable' | 'worse' | 'unknown'
