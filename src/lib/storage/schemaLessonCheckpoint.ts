import { getUserDrafts, setUserDrafts } from './draftStorage'

export const SCHEMA_LESSON_CHECKPOINT_PREFIX = 'schemaLesson:' as const

export const SCHEMA_LESSON_CHECKPOINT_MAX_AGE_MS = 48 * 60 * 60 * 1000

function key(lessonId: string): string {
  return `${SCHEMA_LESSON_CHECKPOINT_PREFIX}${lessonId}`
}

/** Read checkpoint without mutating storage (e.g. resume resolver). Stale entries return null. */
export function readSchemaLessonCheckpointMeta(
  userId: string,
  lessonId: string
): { stepIndex: number; updatedAt: string } | null {
  if (typeof window === 'undefined') return null
  const drafts = getUserDrafts(userId)
  const raw = drafts.activeLessonState?.[key(lessonId)]
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.stepIndex !== 'number' || o.stepIndex < 0) return null
  if (typeof o.updatedAt !== 'string') return null
  const age = Date.now() - Date.parse(o.updatedAt)
  if (!Number.isFinite(age) || age > SCHEMA_LESSON_CHECKPOINT_MAX_AGE_MS) return null
  return { stepIndex: Math.floor(o.stepIndex), updatedAt: o.updatedAt }
}

export function saveSchemaLessonCheckpoint(userId: string, lessonId: string, stepIndex: number): void {
  if (typeof window === 'undefined') return
  const drafts = getUserDrafts(userId)
  setUserDrafts(userId, {
    ...drafts,
    activeLessonState: {
      ...(drafts.activeLessonState ?? {}),
      [key(lessonId)]: {
        stepIndex,
        updatedAt: new Date().toISOString(),
      },
    },
  })
}

export function loadSchemaLessonCheckpoint(userId: string, lessonId: string): number | null {
  if (typeof window === 'undefined') return null
  const drafts = getUserDrafts(userId)
  const raw = drafts.activeLessonState?.[key(lessonId)]
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.stepIndex !== 'number' || o.stepIndex < 0) return null
  if (typeof o.updatedAt !== 'string') return null
  const age = Date.now() - Date.parse(o.updatedAt)
  if (!Number.isFinite(age) || age > SCHEMA_LESSON_CHECKPOINT_MAX_AGE_MS) {
    clearSchemaLessonCheckpoint(userId, lessonId)
    return null
  }
  return Math.floor(o.stepIndex)
}

export function clearSchemaLessonCheckpoint(userId: string, lessonId: string): void {
  const drafts = getUserDrafts(userId)
  const next = { ...(drafts.activeLessonState ?? {}) }
  delete next[key(lessonId)]
  setUserDrafts(userId, {
    ...drafts,
    activeLessonState: Object.keys(next).length > 0 ? next : undefined,
  })
}
