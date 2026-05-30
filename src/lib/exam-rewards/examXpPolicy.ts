/** Base XP before anti-farm scaling (meaningful completion only). */

export const XP_EXAM_SPEAKING_TRAINING_MIN = 14
export const XP_EXAM_SPEAKING_TRAINING_MAX = 24

export const XP_EXAM_MICRO_TASK_MIN = 8
export const XP_EXAM_MICRO_TASK_MAX = 12

export const XP_EXAM_WRITING_TASK_MIN = 12
export const XP_EXAM_WRITING_TASK_MAX = 18

export const XP_EXAM_SIMULATION_MIN = 20
export const XP_EXAM_SIMULATION_MAX = 28

export const XP_EXAM_PRACTICE_EXAM_MIN = 22
export const XP_EXAM_PRACTICE_EXAM_MAX = 34

export const XP_EXAM_KMN_QUIZ_MIN = 12
export const XP_EXAM_KMN_QUIZ_MAX = 18

/** Measurable improvement on top of base session XP */
export const XP_EXAM_IMPROVEMENT_BONUS_MIN = 8
export const XP_EXAM_IMPROVEMENT_BONUS_MAX = 14

/** When parallel exam-habit streak crosses a milestone (same rhythm as main streak, smaller amounts). */
export const XP_EXAM_HABIT_STREAK_BONUS: Record<number, number> = {
  3: 6,
  7: 14,
}

/** First-time recognition (kept modest — avoid spam). */
export const XP_EXAM_FIRST_SPEAKING_SIM_BONUS = 8
export const XP_EXAM_PASS_PRACTICE_EXAM_BONUS = 10
export const XP_EXAM_READINESS_READY_BONUS = 12

export function lerpXp(min: number, max: number, t01: number): number {
  const t = Math.min(1, Math.max(0, t01))
  return Math.round(min + (max - min) * t)
}
