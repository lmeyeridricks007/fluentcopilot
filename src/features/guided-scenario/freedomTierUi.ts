import type { GuidedFreedomTier } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'

/** How many suggested reply chips stay visible (gradual freedom). */
export function maxVisibleSuggestions(tier: GuidedFreedomTier): number {
  switch (tier) {
    case 'full_support':
      return 8
    case 'reduced':
      return 3
    case 'light':
      return 2
    case 'open':
      return 1
    default:
      return 3
  }
}

export function tierEncouragesOpenTyping(tier: GuidedFreedomTier): boolean {
  return tier === 'light' || tier === 'open'
}
