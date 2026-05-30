/**
 * A2-safe difficulty progression for speaking training (bands 1–4).
 * Higher band = meer detail, minder impliciete hulp — blijft binnen A2.
 */
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'

const SUBTYPE_ORDER: Record<SpeakingTrainingItem['subtype'], number> = {
  preference: 0,
  routine: 1,
  opinion: 2,
  explanation: 3,
}

/**
 * Sort session questions: oplopende moeilijkheid, daarna stabiele volgorde op subtype/id.
 */
export function orderSpeakingItemsForProgression(items: SpeakingTrainingItem[]): SpeakingTrainingItem[] {
  return [...items].sort((a, b) => {
    if (a.difficultyBand !== b.difficultyBand) return a.difficultyBand - b.difficultyBand
    const st = SUBTYPE_ORDER[a.subtype] - SUBTYPE_ORDER[b.subtype]
    if (st !== 0) return st
    return a.id.localeCompare(b.id)
  })
}

export const SPEAKING_DIFFICULTY_BAND_COPY_NL: Record<
  1 | 2 | 3 | 4,
  { short: string; coachHint: string }
> = {
  1: {
    short: 'Niveau 1 — kort en herkenbaar',
    coachHint: 'Een of twee korte zinnen volstaan vaak; blijf bij de vraag.',
  },
  2: {
    short: 'Niveau 2 — met reden of detail',
    coachHint: 'Voeg een korte reden toe (omdat/want) of noem een extra detail.',
  },
  3: {
    short: 'Niveau 3 — vergelijken of uitleggen',
    coachHint: 'Structuur met twee delen: antwoord + uitleg of vergelijking.',
  },
  4: {
    short: 'Niveau 4 — vollediger antwoord',
    coachHint: 'Meerdere zinnen; maak beide delen van de opdracht expliciet.',
  },
}
