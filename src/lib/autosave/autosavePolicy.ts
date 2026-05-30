/**
 * Debounced autosave for typing — balances loss risk vs localStorage churn.
 * @see docs/product/autosave-strategy.md
 */
export const AUTOSAVE_DEBOUNCE_TEXT_MS = 1000

/** Multi-field / session snapshots (simulations, exams) — slightly faster coalescing. */
export const AUTOSAVE_DEBOUNCE_SESSION_MS = 850

/** While a timed exam task is active, also flush snapshot on this interval (refs read inside tick). */
export const AUTOSAVE_INTERVAL_SESSION_MS = 1400

/** Minimum non-whitespace characters before we persist long-form text drafts (reduces noise). */
export const AUTOSAVE_MIN_MEANINGFUL_TEXT_CHARS = 12
