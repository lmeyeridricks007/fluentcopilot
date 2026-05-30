import type { PracticeExamCompareDelta } from '@/lib/exam-prep/practice-exams/types'
import type { ReadinessStateLabel } from '@/lib/exam-readiness/types'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import type { MilestoneHit } from '@/lib/retention/types'

/** Parallel “exam habit” streak (any meaningful exam prep on a day). Stored in retention metadata. */
export type ExamPrepHabitStreakState = {
  current: number
  longest: number
  lastActiveLocalDate: string | null
}

export type ExamPrepMissionNotify = {
  domain: 'speaking' | 'writing' | 'listening' | 'reading' | 'kmn'
  mode: 'training' | 'simulation' | 'practice_exam'
  normalizedPercent?: number
  categoryScores?: Record<string, number>
}

/**
 * One completed exam-prep unit for retention. Each variant must represent a finished interaction
 * (not a screen open).
 */
export type ExamPrepRetentionInput =
  | {
      kind: 'speaking_training_session'
      userId?: string
      scenarioId: 'exam_speaking_training'
      outcome: SessionOutcome
      averageNormalizedPercent: number
      passesCount: number
      questionCount: number
      categoryScores?: Record<string, number>
    }
  | {
      kind: 'speaking_simulation_session'
      userId?: string
      scenarioId: 'exam_speaking_simulation'
      outcome: SessionOutcome
      averageNormalizedPercent: number
      categoryScores?: Record<string, number>
    }
  | {
      kind: 'writing_training_task'
      userId?: string
      scenarioId: 'exam_writing_training'
      outcome: SessionOutcome
      normalizedPercent: number
      pass: boolean
      categoryScores?: Record<string, number>
    }
  | {
      kind: 'writing_simulation_session'
      userId?: string
      scenarioId: 'exam_writing_simulation'
      outcome: SessionOutcome
      averageNormalizedPercent: number
      categoryScores?: Record<string, number>
    }
  | {
      kind: 'listening_training_task'
      userId?: string
      scenarioId: 'exam_listening_training'
      outcome: SessionOutcome
      taskId: string
      correct: boolean
    }
  | {
      kind: 'reading_training_task'
      userId?: string
      scenarioId: 'exam_reading_training'
      outcome: SessionOutcome
      taskId: string
      correct: boolean
    }
  | {
      kind: 'kmn_quiz_round'
      userId?: string
      topicId: string
      questionCount: number
    }
  | {
      kind: 'practice_exam'
      userId?: string
      module: 'speaking' | 'writing' | 'listening' | 'reading' | 'kmn'
      setId: string
      averagePercent: number
      passedRatio: number
      taskCount: number
      attemptNumber: number
      compareDelta: PracticeExamCompareDelta
      deltaPoints: number | null
      readinessState: ReadinessStateLabel
      /** Optional; forwarded to exam-prep missions when present (e.g. rubric averages). */
      categoryScores?: Record<string, number>
    }

export type ExamPrepRetentionSummary = {
  totalXp: number
  baseXp: number
  improvementBonusXp: number
  /** XP from parallel exam-habit streak milestones only */
  examHabitBonusXp: number
  examHabitStreak: number
  examHabitStreakExtended: boolean
  mainStreakExtended: boolean
  primaryLine: string
  secondaryLine?: string
  badgeLine?: string
}

export type ExamRewardComputation = {
  antiFarmRef: string
  baseXpRaw: number
  qualifiesMainStreak: boolean
  improvementBonusXp: number
  examHabitStreakNext: ExamPrepHabitStreakState
  examHabitExtended: boolean
  examHabitMilestoneDay: 3 | 7 | null
  milestones: MilestoneHit[]
  seenIdsToAppend: string[]
  metadataUpdates: Record<string, unknown>
  missionNotify: ExamPrepMissionNotify
  summaryLines: { primary: string; secondary?: string; badge?: string }
}
