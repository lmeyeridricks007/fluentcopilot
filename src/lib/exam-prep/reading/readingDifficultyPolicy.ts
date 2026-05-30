/**
 * User-facing difficulty preset → content pool filter by authored band.
 *
 * - **light**: band 1 only — shorter, more direct texts in the bank.
 * - **standard**: bands 1–2 — mixed A2 practical texts.
 * - **strong**: bands 1–3 — includes denser wording and less obvious distractors in authored content.
 *
 * Option count and text length are primarily content-driven (bank); preset widens the pool, not runtime trimming.
 */
import type { ReadingTrainingItem } from '@/lib/schemas/exam/readingTrainingItem.schema'

export type ReadingDifficultyPreset = 'light' | 'standard' | 'strong'

export const READING_DIFFICULTY_LABELS: Record<ReadingDifficultyPreset, { nl: string; en: string }> = {
  light: { nl: 'Lichter A2', en: 'Lighter A2' },
  standard: { nl: 'Standaard A2', en: 'Standard A2' },
  strong: { nl: 'Sterker A2', en: 'Stronger A2' },
}

export function allowedDifficultyBands(preset: ReadingDifficultyPreset): number[] {
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

export function filterItemsByPreset(items: ReadingTrainingItem[], preset: ReadingDifficultyPreset): ReadingTrainingItem[] {
  const bands = new Set(allowedDifficultyBands(preset))
  return items.filter((i) => bands.has(i.difficultyBand))
}
