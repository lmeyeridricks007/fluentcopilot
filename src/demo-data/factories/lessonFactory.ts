/**
 * Lesson catalog — multimodal schema module (People & daily rhythm).
 */

import type { DemoLesson } from '../types'
import { SCHEMA_PEOPLE_DAILY_DEMO_LESSONS } from '../curriculum/schemaPeopleDailyPath'

const LESSON_SPINE_STEPS = 8

export function buildLessonCatalog(): DemoLesson[] {
  return SCHEMA_PEOPLE_DAILY_DEMO_LESSONS
}

export function applyLessonProgress(
  lessons: DemoLesson[],
  completedIds: string[],
  inProgressId: string | null,
  inProgressStep?: number
): DemoLesson[] {
  return lessons.map((l) => {
    const completed = completedIds.includes(l.id)
    const inProgress = l.id === inProgressId
    return {
      ...l,
      completed,
      progress: completed
        ? 100
        : inProgress && inProgressStep != null
          ? Math.round((inProgressStep / LESSON_SPINE_STEPS) * 100)
          : 0,
    }
  })
}
