import type { SessionPerformanceSignals } from '@/lib/practice-feedback/types'
import type { VocabSuggestionVm } from '@/lib/practice-feedback/types'

const MAX_FREE = 2
const MAX_PREMIUM = 4

export function buildVocabSuggestions(
  signals: SessionPerformanceSignals,
  _keyPhrases: Array<{ phrase: string; translation?: string; context?: string }>,
  premiumDepth: boolean
): VocabSuggestionVm[] {
  const max = premiumDepth ? MAX_PREMIUM : MAX_FREE
  const missed = signals.missedKeyPhrases.slice(0, max)

  return missed.map((m) => ({
    nl: m.phrase,
    en: m.translation,
    note: m.translation ? 'Worth anchoring in this scenario.' : undefined,
  }))
}
