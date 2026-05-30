/**
 * Speak Live scenario goals are often stored as `[GOAL_ID] Human description`.
 * Learners should only see the description; stable ids stay in `goalId`.
 */
export function splitCanonicalScenarioGoal(goal: string): { goalId: string; learnerLabel: string } {
  const trimmed = goal.trim()
  const m = /^\[([A-Za-z0-9_]+)\]\s*(.*)$/s.exec(trimmed)
  if (m?.[1]) {
    const body = (m[2] ?? '').trim()
    return { goalId: m[1], learnerLabel: body.length > 0 ? body : trimmed }
  }
  return { goalId: trimmed, learnerLabel: trimmed }
}

/** Remove any bracketed goal ids (e.g. echoes in LLM prose) — use for one-line summaries. */
export function stripGoalIdBracketsFromText(text: string): string {
  return text
    .replace(/\[[A-Za-z0-9_]+\]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Prepares a goal human label for "You covered …" / coach summary lines:
 * strips bracket ids, trims trailing sentence punctuation, drops a redundant leading "Clearly"
 * so multiple goals join as prose (avoids "ticket you need. and keep …").
 */
export function normalizeGoalPhraseForCoachSummary(label: string): string {
  let s = stripGoalIdBracketsFromText(label).trim()
  s = s.replace(/[.!?;:,…]+$/u, '').trim()
  s = s.replace(/^clearly\s+/i, '').trim()
  return s.toLowerCase()
}
