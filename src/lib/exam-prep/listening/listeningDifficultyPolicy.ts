/**
 * User-facing difficulty preset → content filter + TTS rate (mock audio).
 * Stronger preset = harder bank items + slightly faster speech + fewer total replays allowed.
 */
import type { ListeningTrainingItem } from '@/lib/schemas/exam/listeningTrainingItem.schema'

export type ListeningDifficultyPreset = 'light' | 'standard' | 'strong'

export const LISTENING_DIFFICULTY_LABELS: Record<ListeningDifficultyPreset, { nl: string; en: string }> = {
  light: { nl: 'Lichter A2', en: 'Lighter A2' },
  standard: { nl: 'Standaard A2', en: 'Standard A2' },
  strong: { nl: 'Sterker A2', en: 'Stronger A2' },
}

/** Max times the learner can start audio (first play + every replay) per task. */
export function maxTotalAudioStarts(preset: ListeningDifficultyPreset): number {
  switch (preset) {
    case 'light':
      return 12
    case 'standard':
      return 8
    case 'strong':
      return 5
    default:
      return 8
  }
}

/**
 * Speech rate for browser TTS when no `audioUrl` (product assumption).
 * Real audio files ignore this.
 */
export function speechRateForPreset(preset: ListeningDifficultyPreset): number {
  switch (preset) {
    case 'light':
      return 0.84
    case 'standard':
      return 0.92
    case 'strong':
      return 1.0
    default:
      return 0.92
  }
}

/** Which authored bands appear in the pool for this preset. */
export function allowedDifficultyBands(preset: ListeningDifficultyPreset): number[] {
  switch (preset) {
    case 'light':
      return [1]
    case 'standard':
      return [1, 2]
    case 'strong':
      return [1, 2, 3]
    default:
      return [1, 2]
  }
}

export function filterItemsByPreset(
  items: ListeningTrainingItem[],
  preset: ListeningDifficultyPreset
): ListeningTrainingItem[] {
  const bands = new Set(allowedDifficultyBands(preset))
  return items.filter((i) => bands.has(i.difficultyBand))
}
