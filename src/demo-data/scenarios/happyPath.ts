/**
 * Happy-path scenario: engaged learner with Continue, recommendations, streak.
 */

import type { DemoDataset } from '../types'
import { buildLessonCatalog, applyLessonProgress } from '../factories/lessonFactory'
import { buildProgressSummary } from '../factories/progressFactory'
import { buildScenarioCatalog } from '../factories/scenarioFactory'
import { buildLessonProgress } from '../factories/lessonProgressFactory'
import { buildUsageCounts } from '../factories/usageFactory'
import { buildAchievements } from '../factories/achievementFactory'

const COMPLETED_IDS = [
  'a2-m01-l01-listening-friendly-chats-gist',
  'a2-m01-l02-listening-intro-routines',
  'a2-m01-l03-grammar-present-daily-verbs',
  'a2-m01-l04-practice-questions-word-order',
  'a2-m01-l06-listening-variation-plans',
]
const IN_PROGRESS_ID = 'a2-m01-l05-speaking-daily-routine'
const IN_PROGRESS_STEP = 2

export function buildHappyPathDataset(): DemoDataset {
  const catalog = buildLessonCatalog()
  const lessonProgress = buildLessonProgress({
    completedIds: COMPLETED_IDS,
    inProgressId: IN_PROGRESS_ID,
    inProgressStep: IN_PROGRESS_STEP,
  })
  const lessons = applyLessonProgress(catalog, COMPLETED_IDS, IN_PROGRESS_ID, IN_PROGRESS_STEP)
  const recommended = lessons.filter((l) => !l.completed).slice(0, 5)

  return {
    lessons,
    recommended,
    progress: buildProgressSummary({
      xp: 420,
      streak: 5,
      lessonsCompleted: 12,
      dailyGoal: 3,
      dailyGoalMinutes: 10,
      weeklyMinutes: 85,
    }),
    scenarios: buildScenarioCatalog(),
    lessonProgress,
    usage: buildUsageCounts({
      lessonsCompletedCount: 2,
      scenariosCompletedCount: 1,
    }),
    achievements: buildAchievements(['first-lesson', '5-day-streak']),
  }
}
