import type { SessionPerformanceSignals } from '@/lib/practice-feedback/types'
import type { WordOrderNoteVm } from '@/lib/practice-feedback/types'

const MAX = 1

/** Dutch: time expression often needs verb-second in main clauses — surface one clear pattern. */
export function detectWordOrderNotes(signals: SessionPerformanceSignals): WordOrderNoteVm[] {
  if (!signals.wordOrderRisk) return []

  return [
    {
      id: 'time-adverb-v2',
      message:
        'After time words like “vandaag” or “morgen”, Dutch usually puts the verb next: Vandaag werk ik thuis.',
      modelSentence: 'Vandaag werk ik thuis. (not: Vandaag ik werk …)',
    },
  ].slice(0, MAX)
}
