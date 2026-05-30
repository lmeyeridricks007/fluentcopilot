import {
  attemptsForPracticeExamSet,
  loadPracticeExamAttempts,
} from '@/lib/exam-prep/practice-exams/practiceExamAttemptService'
import type { PracticeExamAttemptStored, PracticeExamProgressSnapshot, PracticeExamSetId } from '@/lib/exam-prep/practice-exams/types'

export function progressForPracticeExamSet(setId: PracticeExamSetId): PracticeExamProgressSnapshot {
  const attempts = attemptsForPracticeExamSet(setId)
  const lastAttempt = attempts[0] ?? null
  let best: PracticeExamAttemptStored | null = null
  for (const a of attempts) {
    if (!best || a.averagePercent > best.averagePercent) best = a
  }
  return {
    setId,
    attemptCount: attempts.length,
    lastAttempt,
    bestAttempt: best,
    bestPercent: best?.averagePercent ?? null,
    lastPercent: lastAttempt?.averagePercent ?? null,
  }
}

export function countAttemptsForModule(module: PracticeExamAttemptStored['module']): number {
  return loadPracticeExamAttempts().filter((a) => a.module === module).length
}
