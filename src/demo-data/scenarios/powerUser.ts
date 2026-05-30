/**
 * Power-user scenario: high XP, long streak, many completions.
 */

import type { DemoDataset } from '../types'
import { SCHEMA_PEOPLE_DAILY_LESSON_IDS_ORDERED } from '../curriculum/schemaPeopleDailyPath'
import { buildLessonCatalog, applyLessonProgress } from '../factories/lessonFactory'
import { buildProgressSummary } from '../factories/progressFactory'
import { buildScenarioCatalog } from '../factories/scenarioFactory'
import { buildLessonProgress } from '../factories/lessonProgressFactory'
import { buildUsageCounts } from '../factories/usageFactory'
import { buildAchievements } from '../factories/achievementFactory'

export function buildPowerUserDataset(): DemoDataset {
  const catalog = buildLessonCatalog()
  const lessons = applyLessonProgress(catalog, SCHEMA_PEOPLE_DAILY_LESSON_IDS_ORDERED, null)
  const recommended = lessons.filter((l) => !l.completed).slice(0, 3) // all done; recommend review or empty

  return {
    lessons,
    recommended,
    progress: buildProgressSummary({
      xp: 2140,
      streak: 14,
      lessonsCompleted: 28,
      dailyGoal: 3,
      dailyGoalMinutes: 15,
      weeklyMinutes: 120,
    }),
    scenarios: buildScenarioCatalog(),
    lessonProgress: buildLessonProgress({
      completedIds: SCHEMA_PEOPLE_DAILY_LESSON_IDS_ORDERED,
      inProgressId: null,
    }),
    usage: buildUsageCounts({
      lessonsCompletedCount: 3,
      scenariosCompletedCount: 4,
    }),
    achievements: buildAchievements([
      'first-lesson',
      '5-day-streak',
      'vocabulary-builder',
      'first-scenario',
      'week-warrior',
    ]),
  }
}