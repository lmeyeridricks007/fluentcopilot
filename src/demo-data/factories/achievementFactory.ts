/**
 * Achievement definitions and factory for demo-data.
 * Used by Achievements page; scenario controls which ids are unlocked.
 */

import type { DemoAchievement } from '../types'

const DEFINITIONS: Omit<DemoAchievement, 'earned' | 'earnedAt'>[] = [
  { id: 'first-lesson', name: 'First lesson', description: 'Complete your first lesson', iconId: 'star' },
  { id: '5-day-streak', name: '5 day streak', description: 'Practice 5 days in a row', iconId: 'trophy' },
  { id: 'vocabulary-builder', name: 'Vocabulary builder', description: 'Learn 50 words', iconId: 'target' },
  { id: 'first-scenario', name: 'First scenario', description: 'Complete your first conversation scenario', iconId: 'message-circle' },
  { id: 'week-warrior', name: 'Week warrior', description: '7 day streak', iconId: 'flame' },
]

/**
 * Build full achievement list with earned state.
 * @param unlockedIds - Achievement ids the user has earned (e.g. ['first-lesson', '5-day-streak'])
 */
export function buildAchievements(unlockedIds: string[]): DemoAchievement[] {
  const set = new Set(unlockedIds)
  return DEFINITIONS.map((d) => ({
    ...d,
    earned: set.has(d.id),
    earnedAt: set.has(d.id) ? new Date().toISOString().slice(0, 10) : undefined,
  }))
}
