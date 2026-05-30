/**
 * Taxonomy for incremental persistence (see `docs/product/incremental-save-strategy.md`).
 */
export type IncrementalSaveDomain =
  | 'lessons'
  | 'practice'
  | 'review'
  | 'exams'
  | 'onboarding'
  | 'settings'
  | 'profile'
  | 'missions'

export type IncrementalSaveMode = 'immediate' | 'debounced'

export type IncrementalSaveResult = 'completed' | 'failed' | 'skipped'
