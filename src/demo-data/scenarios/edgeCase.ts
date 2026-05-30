/**
 * Edge-case scenario: one in-progress lesson, low usage, minimal activity.
 */

import type { DemoDataset } from '../types'
import { buildLessonCatalog, applyLessonProgress } from '../factories/lessonFactory'
import { buildProgressSummary } from '../factories/progressFactory'
import { buildScenarioCatalog } from '../factories/scenarioFactory'
import { buildLessonProgress } from '../factories/lessonProgressFactory'
import { buildUsageCounts } from '../factories/usageFactory'
import { buildAchievements } from '../factories/achievementFactory'

export function buildEdgeCaseDataset(): DemoDataset {
  const catalog = buildLessonCatalog()
  const lessons = applyLessonProgress(catalog, [], 'a2-m01-l03-grammar-present-daily-verbs', 1)
  const recommended = lessons.slice(0, 4)

  return {
    lessons,
    recommended,
    progress: buildProgressSummary({
      xp: 50,
      streak: 0,
      lessonsCompleted: 1,
      dailyGoal: 3,
      dailyGoalMinutes: 10,
      weeklyMinutes: 12,
    }),
    scenarios: buildScenarioCatalog(),
    lessonProgress: buildLessonProgress({
      completedIds: [],
      inProgressId: 'a2-m01-l03-grammar-present-daily-verbs',
      inProgressStep: 1,
    }),
    usage: buildUsageCounts({ lessonsCompletedCount: 0, scenariosCompletedCount: 0 }),
    achievements: buildAchievements([]),
  }
}