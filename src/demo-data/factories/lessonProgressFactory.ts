/**
 * Lesson progress factory — per-user lesson status (in_progress, completed).
 */

import type { DemoLessonProgress } from '../types'

function nowIso(): string {
  return new Date().toISOString()
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export function buildLessonProgress(opts: {
  completedIds: string[]
  inProgressId?: string | null
  inProgressStep?: number
}): DemoLessonProgress[] {
  const { completedIds, inProgressId, inProgressStep = 0 } = opts
  const rows: DemoLessonProgress[] = []

  completedIds.forEach((lessonId, i) => {
    rows.push({
      lessonId,
      status: 'completed',
      lastStepIndex: 7,
      score: 70 + Math.floor(Math.random() * 25),
      completedAt: daysAgo(i < 2 ? 0 : i),
      updatedAt: daysAgo(i < 2 ? 0 : i),
    })
  })

  if (inProgressId) {
    rows.push({
      lessonId: inProgressId,
      status: 'in_progress',
      lastStepIndex: inProgressStep,
      updatedAt: nowIso(),
    })
  }

  return rows
}
