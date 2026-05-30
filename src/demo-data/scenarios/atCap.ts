/**
 * At-cap scenario: free user has used 5/5 lessons today; cap modal on new start.
 */

import type { DemoDataset } from '../types'
import { buildLessonCatalog, applyLessonProgress } from '../factories/lessonFactory'
import { buildProgressSummary } from '../factories/progressFactory'
import { buildScenarioCatalog } from '../factories/scenarioFactory'
import { buildLessonProgress } from '../factories/lessonProgressFactory'
import { buildUsageCounts } from '../factories/usageFactory'
import { buildAchievements } from '../factories/achievementFactory'

const COMPLETED_TODAY_IDS = [
  'a2-m01-l01-listening-friendly-chats-gist',
  'a2-m01-l02-listening-intro-routines',
  'a2-m01-l03-grammar-present-daily-verbs',
  'a2-m01-l04-practice-questions-word-order',
  'a2-m01-l05-speaking-daily-routine',
]

export function buildAtCapDataset(): DemoDataset {
  const catalog = buildLessonCatalog()
  const lessons = applyLessonProgress(catalog, COMPLETED_TODAY_IDS, null)
  const recommended = lessons.filter((l) => !l.completed).slice(0, 5)

  return {
    lessons,
    recommended,
    progress: buildProgressSummary({
      xp: 380,
      streak: 4,
      lessonsCompleted: 10,
      dailyGoal: 5,
      dailyGoalMinutes: 10,
      weeklyMinutes: 70,
    }),
    scenarios: buildScenarioCatalog(),
    lessonProgress: buildLessonProgress({
      completedIds: COMPLETED_TODAY_IDS,
      inProgressId: null,
    }),
    usage: buildUsageCounts({
      lessonsCompletedCount: 5,
      scenariosCompletedCount: 0,
    }),
    achievements: buildAchievements(['first-lesson']),
  }
}
