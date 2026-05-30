/**
 * Aligns with backend {@link normalizeGoalPhraseForCoachSummary} — safe for client recap lines.
 */
export function stripGoalIdBracketsFromTextClient(text: string): string {
  return text
    .replace(/\[[A-Za-z0-9_]+\]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function normalizeGoalPhraseForSummaryLine(label: string): string {
  let s = stripGoalIdBracketsFromTextClient(label).trim()
  s = s.replace(/[.!?;:,…]+$/u, '').trim()
  s = s.replace(/^clearly\s+/i, '').trim()
  return s.toLowerCase()
}
