import type { AbilityConfidenceTrendUi } from '@/lib/schemas/practice/abilityMasteryState.schema'

const MS_DAY = 86_400_000

/**
 * Practical trend: history slope + recency for “needs refresh”.
 */
export function computeAbilityTrendUi(input: {
  scoreHistory: number[] | undefined
  lastPracticedAt: string | null
  displayScore: number
}): AbilityConfidenceTrendUi {
  if (input.displayScore >= 0.68 && input.lastPracticedAt) {
    const days = (Date.now() - new Date(input.lastPracticedAt).getTime()) / MS_DAY
    if (days > 16) return 'needs_refresh'
  }

  const h = input.scoreHistory ?? []
  if (h.length < 3) return 'stable'
  const early = h[0]!
  const late = h[h.length - 1]!
  if (late - early > 0.045) return 'improving'
  if (early - late > 0.045) return 'slipping'
  return 'stable'
}
