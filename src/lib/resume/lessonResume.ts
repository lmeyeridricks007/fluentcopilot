import { peopleDailySchemaPlayerHref } from '@/demo-data/curriculum/schemaPeopleDailyPath'
import { REGISTERED_SCHEMA_MODULES } from '@/features/learning-path/schemaModuleRegistry'
import { SCHEMA_LESSON_CHECKPOINT_PREFIX, readSchemaLessonCheckpointMeta } from '@/lib/storage/schemaLessonCheckpoint'
import { getUserDrafts } from '@/lib/storage/draftStorage'
import { RESUME_PRIORITY_RANK } from './resumePriority'
import type { ResumableFlow } from './resumeTypes'

function schemaLessonStepCount(lessonId: string): number | null {
  for (const reg of REGISTERED_SCHEMA_MODULES) {
    const les = reg.module.lessons.find((l) => l.id === lessonId)
    if (les) return les.steps.length
  }
  return null
}

function schemaLessonTitle(lessonId: string): string | null {
  for (const reg of REGISTERED_SCHEMA_MODULES) {
    const les = reg.module.lessons.find((l) => l.id === lessonId)
    if (les) return les.title
  }
  return null
}

/**
 * Latest meaningful in-progress schema lesson (checkpoint step > 0, not completed, valid step window).
 */
export function findResumableSchemaLesson(
  userId: string,
  completedLessonIds: string[]
): ResumableFlow | null {
  if (!userId || typeof window === 'undefined') return null

  const drafts = getUserDrafts(userId)
  const state = drafts.activeLessonState ?? {}
  let best: { lessonId: string; updatedAt: string; stepIndex: number; total: number } | null = null

  for (const k of Object.keys(state)) {
    if (!k.startsWith(SCHEMA_LESSON_CHECKPOINT_PREFIX)) continue
    const lessonId = k.slice(SCHEMA_LESSON_CHECKPOINT_PREFIX.length)
    if (!lessonId || completedLessonIds.includes(lessonId)) continue

    const meta = readSchemaLessonCheckpointMeta(userId, lessonId)
    if (!meta) continue
    if (meta.stepIndex <= 0) continue

    const total = schemaLessonStepCount(lessonId)
    if (total == null || meta.stepIndex >= total) continue

    if (!best || Date.parse(meta.updatedAt) > Date.parse(best.updatedAt)) {
      best = { lessonId, updatedAt: meta.updatedAt, stepIndex: meta.stepIndex, total }
    }
  }

  if (!best) return null

  const title = schemaLessonTitle(best.lessonId) ?? 'Lesson'
  return {
    kind: 'schema_lesson',
    priorityRank: RESUME_PRIORITY_RANK.lesson,
    title: 'Continue lesson',
    summary: `${title} — step ${best.stepIndex + 1} of ${best.total}`,
    lastUpdatedAt: best.updatedAt,
    continueHref: peopleDailySchemaPlayerHref(best.lessonId),
    allowRestart: true,
    restartPayload: { type: 'lesson', lessonId: best.lessonId },
  }
}
