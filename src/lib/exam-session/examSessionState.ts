/**
 * Canonical exam session model for simulations (writing, speaking, listening, reading, kmn).
 * Training flows do not use this lifecycle — only `mode: simulation` / practice exams.
 */

export type ExamTypeId = 'writing' | 'speaking' | 'listening' | 'reading' | 'kmn'

export type ExamSessionMode = 'simulation'

export type ExamSessionStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned'

/** Generic task slot in an exam session (content-agnostic). */
export type ExamTaskSlot = {
  id: string
  /** Domain-specific type e.g. form | message | text_to_audience */
  type: string
  /** Monotonic order in session */
  order: number
  /** Optional weight for analytics / future section timing */
  timeWeight?: number
}

export type ExamSession = {
  id: string
  examType: ExamTypeId
  mode: ExamSessionMode
  /** Wall-clock budget for the whole session (seconds). */
  totalTimeLimitSec: number
  startedAtMs: number | null
  endedAtMs: number | null
  currentTaskIndex: number
  tasks: ExamTaskSlot[]
  status: ExamSessionStatus
}

/** Result envelope after submission (filled by domain-specific aggregators). */
export type ExamSessionResult = {
  sessionId: string
  examType: ExamTypeId
  totalScore?: number
  maxScore?: number
  normalizedPercent?: number
  perCategoryScores?: Record<string, number>
  passLikelihood?: string
  weaknesses?: string[]
  recommendationIds?: string[]
}
