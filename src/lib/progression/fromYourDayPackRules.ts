/**
 * Shared step thresholds for “From your day” packs: at least min(3, total) steps checked
 * and ≥55% of work steps marked — used by UI, progression payloads, and retention hooks.
 */
export function fromYourDayPackProgressCountsQualify(input: { stepsTotal: number; stepsCompleted: number }): boolean {
  const total = Math.max(0, input.stepsTotal)
  const done = Math.max(0, input.stepsCompleted)
  if (total === 0) return false
  const minBar = Math.min(3, total)
  const ratioOk = done / total >= 0.55
  return done >= minBar && ratioOk
}

/**
 * Rules for when a “From your day” personalized pack completion earns progression credit
 * (XP + streak). Same bar as {@link recordFromYourDayPracticeComplete} mission eligibility.
 */
export function fromYourDayPackCompletionQualifies(input: {
  stepsTotal: number
  stepsCompleted: number
  /** Caller sets true when the learner marked the flow finished (not abandoned mid-way). */
  markedComplete: boolean
}): boolean {
  if (!input.markedComplete) return false
  return fromYourDayPackProgressCountsQualify({
    stepsTotal: input.stepsTotal,
    stepsCompleted: input.stepsCompleted,
  })
}
