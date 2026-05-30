import type { ExamXpMeta } from './types'

function bandFromSeed(seed: string, min: number, max: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const span = max - min + 1
  return min + (h % span)
}

/**
 * Exam-specific XP bands (product brief). Server applies via {@link calculateXP} when session type is exam_*.
 */
export function computeExamXpBand(params: {
  sessionId: string
  meta: ExamXpMeta
  tasksCompleted: number
  minTasksRequired: number
}): { base: number; weaknessBonus: number; timedBonus: number; readinessBonus: number } {
  if (params.tasksCompleted < params.minTasksRequired) {
    return { base: 0, weaknessBonus: 0, timedBonus: 0, readinessBonus: 0 }
  }
  const { meta, sessionId } = params
  /** Simulation: full 25–45, section 15–30. Training: guided 15–25, timed 20–30 (no extra timed stack). */
  let base = 18
  if (meta.runMode === 'simulation') {
    base =
      meta.scope === 'full'
        ? bandFromSeed(sessionId, 25, 45)
        : bandFromSeed(sessionId, 15, 30)
  } else {
    base = meta.timedTraining
      ? bandFromSeed(sessionId, 20, 30)
      : bandFromSeed(sessionId, 15, 25)
  }
  const weaknessBonus = meta.weaknessRepair ? bandFromSeed(`${sessionId}:w`, 5, 12) : 0
  const timedBonus = 0
  const readinessBonus = meta.readinessLift ? bandFromSeed(`${sessionId}:r`, 2, 5) : 0
  return { base, weaknessBonus, timedBonus, readinessBonus }
}
