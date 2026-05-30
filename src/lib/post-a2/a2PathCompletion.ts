import type { DemoLessonProgress } from '@/demo-data/types'
import { REGISTERED_SCHEMA_MODULES } from '@/features/learning-path/schemaModuleRegistry'
import { mergeRetentionCompletionsIntoLessonProgress } from '@/lib/retention/unlocks'

let cachedLessonIds: string[] | null = null

/**
 * All lesson ids from shipped schema modules on the A2 path (registration manifest).
 */
export function getRegisteredA2LessonIds(): string[] {
  if (cachedLessonIds) return cachedLessonIds
  const ids = new Set<string>()
  for (const reg of REGISTERED_SCHEMA_MODULES) {
    for (const les of reg.module.lessons) {
      ids.add(les.id)
    }
  }
  cachedLessonIds = [...ids]
  return cachedLessonIds
}

export function isRegisteredA2Lesson(lessonId: string): boolean {
  return getRegisteredA2LessonIds().includes(lessonId)
}

/**
 * True when every registered schema lesson on the A2 path is marked completed.
 */
export function isA2CurriculumComplete(completedLessonIds: readonly string[]): boolean {
  const done = new Set(completedLessonIds)
  const all = getRegisteredA2LessonIds()
  return all.length > 0 && all.every((id) => done.has(id))
}

/**
 * Same as {@link isA2CurriculumComplete} but merges retention completions into demo path rows first
 * (matches Learning Path / home card logic).
 */
export function isA2PathCompleteMerged(
  completedLessonIdsFromRetention: readonly string[],
  baseProgress: readonly DemoLessonProgress[]
): boolean {
  const merged = mergeRetentionCompletionsIntoLessonProgress(baseProgress, completedLessonIdsFromRetention)
  const doneIds = new Set(merged.filter((p) => p.status === 'completed').map((p) => p.lessonId))
  const all = getRegisteredA2LessonIds()
  return all.length > 0 && all.every((id) => doneIds.has(id))
}
