/**
 * Canonical exports for learning content + user-state schemas.
 *
 * - **Content**: course → module → lesson → step (+ grammar/vocab targets, review item definitions)
 * - **User state**: mistakeEvent, srsItem, userMastery
 *
 * Import from `@/lib/schemas` in app code; validate fixtures with `tools/validate-content.ts`.
 */

export * from '@/lib/schemas/shared.schema'
export * from '@/lib/schemas/feedback.schema'
export * from '@/lib/schemas/grammarTarget.schema'
export * from '@/lib/schemas/vocabTarget.schema'
export * from '@/lib/schemas/exercise.schema'
export * from '@/lib/schemas/lessonStep.schema'
export * from '@/lib/schemas/lesson.schema'
export * from '@/lib/schemas/module.schema'
export * from '@/lib/schemas/course.schema'
export * from '@/lib/schemas/reviewItem.schema'
export * from '@/lib/schemas/mistakeEvent.schema'
export * from '@/lib/schemas/srsItem.schema'
export * from '@/lib/schemas/userMastery.schema'
export * from '@/lib/schemas/practice'
export * from '@/lib/schemas/exam'
