import type { ExerciseBlockResultPayload } from '@/features/generated-exercise-pack/exerciseBlockResult'

export type InteractiveBlockCompletionState = 'not_started' | 'completed'

/** One interactive beat — survives refresh when stored in {@link InteractivePackProgressV2}. */
export type InteractiveBlockProgressRecord = {
  completionState: InteractiveBlockCompletionState
  /** ISO-8601 when the learner first completed this beat (immutable after set — anti-farming). */
  completedAt: string
  result?: ExerciseBlockResultPayload
}

export const INTERACTIVE_PACK_PROGRESS_SCHEMA = 2 as const

export type InteractivePackProgressV2 = {
  schemaVersion: typeof INTERACTIVE_PACK_PROGRESS_SCHEMA
  blocks: Record<string, InteractiveBlockProgressRecord>
}
