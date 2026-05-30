/**
 * Client-side mistake log for schema lessons (append-only).
 * Pairs with weak-tag recording when errorTags are present on the step.
 */
import type { MistakeErrorType } from '@/lib/schemas/mistakeEvent.schema'
import { recordWeakSelfCheckTags } from '@/features/curriculum/a2ReviewStore'
import { recordMistakeEvent } from '@/lib/mistakes/mistakeTagger'
import { localReviewPersistence } from '@/lib/review-engine/reviewPersistence'
import { getRetentionUserId } from '@/lib/retention/retentionService'

function storageKey(): string {
  return `language-tutor-schema-mistakes-v1:${getRetentionUserId()}`
}

export type SchemaMistakeRecord = {
  id: string
  lessonId: string
  stepId: string
  itemId: string
  errorType: MistakeErrorType
  userAnswer: string
  correctAnswer: string
  timestamp: string
  severity: number
  retries?: number
}

function read(): SchemaMistakeRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return []
    const p = JSON.parse(raw) as SchemaMistakeRecord[]
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

function write(rows: SchemaMistakeRecord[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(), JSON.stringify(rows.slice(-500)))
  } catch {
    /* quota */
  }
}

function tagFromErrorType(t: MistakeErrorType): string {
  switch (t) {
    case 'grammar':
      return 'grammar'
    case 'vocab':
      return 'vocab'
    case 'order':
      return 'word-order'
    case 'pronunciation':
      return 'pronunciation'
    case 'listening':
      return 'listening'
    case 'spelling':
      return 'spelling'
    case 'hesitation':
      return 'hesitation'
    default:
      return t
  }
}

export function recordSchemaMistake(input: {
  lessonId: string
  stepId: string
  itemId: string
  errorType: MistakeErrorType
  userAnswer: string
  correctAnswer: string
  severity?: number
  weakTags?: string[]
}): void {
  const row: SchemaMistakeRecord = {
    id: `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    lessonId: input.lessonId,
    stepId: input.stepId,
    itemId: input.itemId,
    errorType: input.errorType,
    userAnswer: input.userAnswer,
    correctAnswer: input.correctAnswer,
    timestamp: new Date().toISOString(),
    severity: input.severity ?? 2,
  }
  const next = [...read(), row]
  write(next)
  const tags = [...(input.weakTags ?? []), tagFromErrorType(input.errorType)]
  recordWeakSelfCheckTags(tags)
  void recordMistakeEvent(localReviewPersistence, {
    userId: getRetentionUserId(),
    lessonId: input.lessonId,
    stepId: input.stepId,
    itemId: input.itemId,
    userAnswer: input.userAnswer,
    correctAnswer: input.correctAnswer,
    severity: input.severity ?? 2,
    errorTypeOverride: input.errorType,
    classify: {
      userAnswer: input.userAnswer,
      correctAnswer: input.correctAnswer,
      contextTags: tags,
    },
  })
}

export function loadSchemaMistakesForLesson(lessonId: string): SchemaMistakeRecord[] {
  return read().filter((r) => r.lessonId === lessonId)
}
