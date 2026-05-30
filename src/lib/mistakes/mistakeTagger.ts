/**
 * Taxonomy for mistakes from lessons + review. Maps to `MistakeEvent.errorType` with
 * richer `metadata.mistakeTags` for future hinting / fix sessions.
 */
import type { MistakeErrorType, MistakeEvent } from '@/lib/schemas/mistakeEvent.schema'
import type { ReviewPersistencePort } from '@/lib/review-engine/reviewPersistence'

export type MistakeCategory =
  | 'grammar'
  | 'vocab_confusion'
  | 'word_order'
  | 'aux_verb'
  | 'politeness'
  | 'pronunciation'
  | 'spelling'
  | 'listening_comprehension'
  | 'hesitation'

export type ClassifyInput = {
  userAnswer: string
  correctAnswer: string
  /** Optional hints from content: common_error_tags, weak tags, etc. */
  contextTags?: string[]
  /** Heuristic flags from runtime. */
  retries?: number
  lowConfidenceSpeech?: boolean
}

function mapCategoryToSchemaError(cat: MistakeCategory): MistakeErrorType {
  switch (cat) {
    case 'pronunciation':
      return 'pronunciation'
    case 'word_order':
    case 'aux_verb':
      return 'order'
    case 'spelling':
      return 'spelling'
    case 'listening_comprehension':
      return 'listening'
    case 'hesitation':
      return 'hesitation'
    case 'vocab_confusion':
      return 'vocab'
    default:
      return 'grammar'
  }
}

/**
 * Lightweight classifier: prefers explicit context tags, then simple heuristics.
 */
export function classifyMistake(input: ClassifyInput): {
  category: MistakeCategory
  errorType: MistakeErrorType
  mistakeTags: string[]
} {
  const tags = new Set<string>(input.contextTags?.map((t) => t.toLowerCase()) ?? [])
  if (input.retries && input.retries >= 2) tags.add('hesitation')
  if (input.lowConfidenceSpeech) tags.add('pronunciation')

  let category: MistakeCategory = 'grammar'
  if (tags.has('word-order') || tags.has('word_order')) category = 'word_order'
  else if (tags.has('vocab') || tags.has('vocab_confusion')) category = 'vocab_confusion'
  else if (tags.has('aux') || tags.has('auxiliary')) category = 'aux_verb'
  else if (tags.has('politeness') || tags.has('register')) category = 'politeness'
  else if (tags.has('pronunciation')) category = 'pronunciation'
  else if (tags.has('spelling')) category = 'spelling'
  else if (tags.has('listening')) category = 'listening_comprehension'
  else if (tags.has('hesitation')) category = 'hesitation'

  const mistakeTags = [...tags, category]
  return {
    category,
    errorType: mapCategoryToSchemaError(category),
    mistakeTags,
  }
}

export async function recordMistakeEvent(
  port: ReviewPersistencePort,
  input: {
    userId: string
    lessonId: string
    stepId: string
    itemId: string
    userAnswer: string
    correctAnswer: string
    severity?: number
    reviewItemId?: string
    /** When set (e.g. schema lesson), preserves learner-facing taxonomy from the step. */
    errorTypeOverride?: MistakeErrorType
    classify?: ClassifyInput
  }
): Promise<MistakeEvent> {
  const cls = input.classify
    ? classifyMistake(input.classify)
    : {
        category: 'grammar' as const,
        errorType: 'grammar' as const,
        mistakeTags: [] as string[],
      }
  const errorType: MistakeErrorType = input.errorTypeOverride ?? cls.errorType
  const ev: MistakeEvent = {
    id: `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    userId: input.userId,
    lessonId: input.lessonId,
    stepId: input.stepId,
    itemId: input.itemId,
    errorType,
    userAnswer: input.userAnswer,
    correctAnswer: input.correctAnswer,
    timestamp: new Date().toISOString(),
    severity: input.severity ?? 2,
    reviewItemId: input.reviewItemId,
    metadata: {
      mistakeTags: cls.mistakeTags,
      category: cls.category,
    },
  }
  await port.appendMistakeEvent(input.userId, ev)
  return ev
}

export function aggregateWeakAreas(events: MistakeEvent[]): Map<string, number> {
  const weights = new Map<string, number>()
  for (const e of events) {
    const tags = (e.metadata as { mistakeTags?: string[] } | undefined)?.mistakeTags ?? [
      e.errorType,
    ]
    for (const t of tags) {
      weights.set(t, (weights.get(t) ?? 0) + e.severity)
    }
  }
  return weights
}
