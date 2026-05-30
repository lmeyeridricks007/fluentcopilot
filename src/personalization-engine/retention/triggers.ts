/**
 * Personalization Engine — retention triggers (streak reminders, daily goals, challenges).
 */

import type { ProgressSnapshot } from '../types/progress.js'
import type { LearnerProfile } from '../types/profile.js'

export interface RetentionTrigger {
  type: 'streak_reminder' | 'daily_goal' | 'challenge' | 'achievement_opportunity'
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export function getRetentionTriggers(
  profile: LearnerProfile,
  progress: ProgressSnapshot | null
): RetentionTrigger[] {
  const triggers: RetentionTrigger[] = []
  if (!progress) return triggers

  if (progress.current_streak_days === 0 && (progress.last_activity_at ?? '') < new Date(Date.now() - 86400 * 1000).toISOString()) {
    triggers.push({
      type: 'streak_reminder',
      reason: 'Start a new streak today',
      priority: 'high',
    })
  }

  if (progress.total_time_minutes < profile.daily_goal_minutes) {
    triggers.push({
      type: 'daily_goal',
      reason: `You have ${profile.daily_goal_minutes - progress.total_time_minutes} minutes left toward your daily goal`,
      priority: 'medium',
    })
  }

  if (progress.current_streak_days >= 3) {
    triggers.push({
      type: 'challenge',
      reason: 'Keep your streak going — try a new scenario today',
      priority: 'low',
    })
  }

  return triggers
}
