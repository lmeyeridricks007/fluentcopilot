/**
 * Progress summary factory — XP, streak, goals, weekly minutes.
 */

import type { DemoProgressSummary } from '../types'

export function buildProgressSummary(opts: {
  xp?: number
  streak?: number
  lessonsCompleted?: number
  dailyGoal?: number
  dailyGoalMinutes?: number
  weeklyMinutes?: number
}): DemoProgressSummary {
  return {
    xp: opts.xp ?? 420,
    streak: opts.streak ?? 5,
    lessonsCompleted: opts.lessonsCompleted ?? 12,
    dailyGoal: opts.dailyGoal ?? 3,
    dailyGoalMinutes: opts.dailyGoalMinutes ?? 10,
    weeklyMinutes: opts.weeklyMinutes ?? 85,
  }
}
