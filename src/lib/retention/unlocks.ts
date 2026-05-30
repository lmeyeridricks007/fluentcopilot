import type { DemoLessonProgress } from '@/demo-data/types'

/**
 * Merge retention-completed lesson IDs into demo path progress so unlocks / next-lesson match real completions.
 */
export function mergeRetentionCompletionsIntoLessonProgress(
  base: readonly DemoLessonProgress[],
  completedLessonIds: readonly string[]
): DemoLessonProgress[] {
  const map = new Map(base.map((p) => [p.lessonId, { ...p }]))
  const now = new Date().toISOString()
  for (const id of completedLessonIds) {
    const existing = map.get(id)
    if (existing?.status === 'completed') continue
    map.set(id, {
      lessonId: id,
      status: 'completed',
      updatedAt: now,
      completedAt: existing?.completedAt ?? now,
      lastStepIndex: existing?.lastStepIndex,
      score: existing?.score,
    })
  }
  return [...map.values()]
}
