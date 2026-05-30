/**
 * Deterministic view model for previews / design QA when progress APIs are incomplete.
 * Not used in production navigation.
 */

import { buildLearningPathViewModel } from './buildLearningPathViewModel'
import type { LearningPathViewModel } from './types'
import { buildCurriculumPathModel } from '@/features/curriculum/types'
import { SCHEMA_PEOPLE_DAILY_DEMO_LESSONS } from '@/demo-data/curriculum/schemaPeopleDailyPath'

export function buildMockLearningPathViewModelForPreview(): LearningPathViewModel {
  const lessonProgress = [
    { lessonId: 'a2-m01-l01-listening-friendly-chats-gist', status: 'completed' as const, updatedAt: new Date().toISOString() },
    { lessonId: 'a2-m01-l02-listening-intro-routines', status: 'completed' as const, updatedAt: new Date().toISOString() },
    { lessonId: 'a2-m01-l03-grammar-present-daily-verbs', status: 'in_progress' as const, updatedAt: new Date().toISOString() },
  ]
  const path = buildCurriculumPathModel(SCHEMA_PEOPLE_DAILY_DEMO_LESSONS, lessonProgress, 'A2')
  return buildLearningPathViewModel({
    path,
    progress: {
      xp: 320,
      streak: 4,
      lessonsCompleted: 8,
      dailyGoal: 3,
      dailyGoalMinutes: 12,
      weeklyMinutes: 64,
    },
    lessonProgress,
    sequentialBandsActive: false,
    pathModuleGatingEnabled: false,
    dueReviewCount: 3,
    weakTagsCount: 2,
    dailyReviewEstMinutes: 3,
  })
}
