import type { AbilityCardVm } from '@/lib/mastery/masteryPresenterModel'

/** Titles of abilities currently in the weak band — sharpens B1 readiness copy when passed to `evaluateReadinessForB1`. */
export function weakAbilityTitlesForReadiness(cards: AbilityCardVm[], max = 4): string[] {
  return cards.filter((c) => c.band === 'weak').map((c) => c.title).slice(0, max)
}
