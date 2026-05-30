import type { InteractiveExercise } from './types'
import type { InteractiveBlockProgressRecord } from './interactivePackProgressTypes'
import { countCompletedHeavyBlocks } from './interactivePackXpPreview'

/** Tunable bar so streak credit needs some “real work”, not only taps through cards. */
export const INTERACTIVE_MEANINGFUL_PRACTICE = {
  /** Require at least this many write/listen/read-aloud/record beats when the pack contains them. */
  minHeavyBlocksWhenAvailable: 1,
} as const

function packOffersHeavyBeats(exercises: readonly InteractiveExercise[]): boolean {
  return exercises.some(
    (e) =>
      e.kind === 'write_your_own_line' ||
      e.kind === 'record_and_compare' ||
      e.kind === 'listening_burst' ||
      e.kind === 'read_aloud_rep',
  )
}

/**
 * When the interactive pack includes effortful beats, require at least one completed
 * before counting as meaningful for streak (works with {@link fromYourDayPackCompletionQualifies}).
 */
export function interactivePackMeetsEffortBar(
  exercises: readonly InteractiveExercise[],
  blocks: Record<string, InteractiveBlockProgressRecord | undefined>,
): boolean {
  if (!packOffersHeavyBeats(exercises)) return true
  return countCompletedHeavyBlocks(exercises, blocks) >= INTERACTIVE_MEANINGFUL_PRACTICE.minHeavyBlocksWhenAvailable
}
