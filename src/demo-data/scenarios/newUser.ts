/**
 * New-user scenario: minimal progress, zeros, empty Continue.
 */

import type { DemoDataset } from '../types'
import { buildLessonCatalog } from '../factories/lessonFactory'
import { buildProgressSummary } from '../factories/progressFactory'
import { buildScenarioCatalog } from '../factories/scenarioFactory'
import { buildLessonProgress } from '../factories/lessonProgressFactory'
import { buildUsageCounts } from '../factories/usageFactory'
import { buildAchievements } from '../factories/achievementFactory'

export function buildNewUserDataset(): DemoDataset {
  const lessons = buildLessonCatalog()
  const recommended = lessons.slice(0, 5)

  return {
    lessons,
    recommended,
    progress: buildProgressSummary({
      xp: 0,
      streak: 0,
      lessonsCompleted: 0,
      dailyGoal: 3,
      dailyGoalMinutes: 10,
      weeklyMinutes: 0,
    }),
    scenarios: buildScenarioCatalog(),
    lessonProgress: buildLessonProgress({ completedIds: [], inProgressId: null }),
    usage: buildUsageCounts({ lessonsCompletedCount: 0, scenariosCompletedCount: 0 }),
    achievements: buildAchievements([]),
  }
}
