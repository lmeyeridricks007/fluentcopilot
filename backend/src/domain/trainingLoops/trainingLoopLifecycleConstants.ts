/** Never-started `active` loops older than this become `stale`. */
export const ACTIVE_LOOP_IGNORE_STALE_DAYS = 10

/** `in_progress` with no touch for this long becomes `stale` (abandoned drill). */
export const IN_PROGRESS_LOOP_ABANDON_STALE_DAYS = 14

/** Recent dismissed loops of the same type reduce generation score within this window. */
export const DISMISSED_LOOP_TYPE_PENALTY_DAYS = 10
