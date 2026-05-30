/**
 * Feature flags for Personalized Training Loop diagnostics (never enabled in production API builds).
 */

/** Persist full generation debug JSON on slot-0 rows when loops are created (see orchestrator). */
export function shouldPersistTrainingLoopGenerationDebug(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  if (process.env.TRAINING_LOOP_STORE_GENERATION_DEBUG === '0') return false
  return true
}
