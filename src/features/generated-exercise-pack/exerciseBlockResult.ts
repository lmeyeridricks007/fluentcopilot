/**
 * Optional payload when a learner completes (or partially completes) a pack block.
 * Parents may forward to analytics or future persistence APIs.
 */
export type ExerciseBlockResultPayload = {
  /** 0–1 when applicable */
  correctness?: number
  userAnswer?: unknown
  /** Short machine-readable tag */
  outcome?: 'correct' | 'incorrect' | 'self_reported' | 'skipped'
}
