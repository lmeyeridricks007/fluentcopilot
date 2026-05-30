import type { SkillTrackExercise } from '@/lib/schemas/practice/skillTrack.schema'

export type ExerciseAttempt = {
  exerciseId: string
  correct?: boolean
  participated?: boolean
}

const PASS_THRESHOLD = 0.62

/**
 * Each exercise: 1 if correct or speaking participation, else 0.
 */
export function scoreSkillTrackSession(attempts: ExerciseAttempt[]): {
  score: number
  correctCount: number
  attemptedCount: number
  passedLevelThreshold: boolean
} {
  const n = attempts.length
  if (n === 0) {
    return { score: 0, correctCount: 0, attemptedCount: 0, passedLevelThreshold: false }
  }
  let correctCount = 0
  for (const a of attempts) {
    if (a.correct === true || a.participated) correctCount += 1
  }
  const score = correctCount / n
  return {
    score,
    correctCount,
    attemptedCount: n,
    passedLevelThreshold: score >= PASS_THRESHOLD,
  }
}

export function exerciseSupportsAutoGrade(ex: SkillTrackExercise): boolean {
  return ex.kind !== 'speaking_prompt'
}

export function xpForSkillTrackScore(score: number, passedLevel: boolean): number {
  let base = 8
  if (score >= 0.85) base = 14
  else if (score >= 0.65) base = 11
  if (passedLevel) base += 2
  return Math.min(16, Math.max(6, base))
}
