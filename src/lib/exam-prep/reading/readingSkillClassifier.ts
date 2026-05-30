/**
 * Reading skill taxonomy — scanning vs comprehension (exam-oriented).
 * Content uses `readingSkill` on each item; this module centralises labels and analytics helpers.
 */
import type { ReadingTrainingItem } from '@/lib/schemas/exam/readingTrainingItem.schema'

export type ReadingSkill = ReadingTrainingItem['readingSkill']

/** Stable analytics / warehouse value. */
export function readingSkillAnalyticsValue(skill: ReadingSkill): string {
  return skill
}

/**
 * One-line focus hint (Dutch). Shown lightly in the question card — not a full “lesson mode” label.
 */
export function readingSkillFocusHintNl(skill: ReadingSkill): string {
  return skill === 'scanning'
    ? 'Zoek het concrete feit of detail in de tekst.'
    : 'Denk na over het hoofdidee en wat de schrijver bedoelt of vraagt.'
}
