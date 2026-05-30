import type { ListeningClip, ListeningLevel } from '@/lib/listening-mode/schema'

/** Resolved MCQ line-up for a clip at runtime (ids stay opt-0 … opt-n-1 by index). */
export type ResolvedListeningMcq = { optionLabels: string[]; correctIndex: number }

/**
 * Per-level MCQ variants: same scenario domain as the audio, harder wrong answers at B1,
 * clearer contrasts at A1. When absent for a level, {@link ListeningClip} catalog fields apply.
 */
const LEVEL_VARIANTS: Partial<Record<string, Partial<Record<ListeningLevel, ResolvedListeningMcq>>>> = {
  'train-gist-1': {
    A1: {
      optionLabels: [
        'A train delay and which platform to use',
        'Buying snacks at a station shop',
        'Bus times from the station to the airport',
        'Where to store luggage at the station',
      ],
      correctIndex: 0,
    },
    B1: {
      optionLabels: [
        'A short delay and the Utrecht train leaves from platform seven',
        'No delay: the Utrecht train departs earlier than planned',
        'The Utrecht train is canceled; use buses instead',
        'Platform seven is announced for a different city than Utrecht',
      ],
      correctIndex: 0,
    },
  },
  'train-order-1': {
    A1: {
      optionLabels: [
        'Get off at Zuid first, then take tram 16',
        'Take tram 16 before you get off the train',
        'Go straight to platform twelve',
        'Buy a ticket at the machine only',
      ],
      correctIndex: 0,
    },
    B1: {
      optionLabels: [
        'Exit at Zuid, then take tram 16 toward VUmc',
        'Take tram 16 toward VUmc, then exit at Zuid',
        'Exit at Zuid, then take tram 6 toward VUmc',
        'Check in on the tram first, then exit at Zuid',
      ],
      correctIndex: 0,
    },
  },
}

export function resolveListeningMcqFromClip(clip: ListeningClip, sessionLevel: ListeningLevel): ResolvedListeningMcq {
  const variant = LEVEL_VARIANTS[clip.id]?.[sessionLevel]
  if (variant && variant.optionLabels.length >= 2 && variant.correctIndex >= 0 && variant.correctIndex < variant.optionLabels.length) {
    return variant
  }
  return { optionLabels: clip.optionLabels, correctIndex: clip.correctIndex }
}
