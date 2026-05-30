import type { DayPracticeStep } from '@/features/quick-capture/personalizedPracticePackBuilder.client'

/** Short label for pack preview lists (hub). */
export function friendlyPackStepPreview(s: DayPracticeStep): string {
  switch (s.kind) {
    case 'short_recap':
      return 'Warm-up'
    case 'theme_anchor':
      return s.themeTitle
    case 'strongest_next':
      return 'Strong finish'
    case 'word_rep':
      return 'Word'
    case 'phrase_rep':
      return 'Phrase'
    case 'correction_rep':
      return 'Smooth the line'
    case 'mini_scenario':
      return 'Mini moment'
    case 'read_aloud':
      return 'Read aloud'
    case 'listening_burst':
      return 'Listening'
    case 'coach_debrief':
      return 'Coach moment'
    case 'pack_meta':
      return 'Overview'
    default: {
      const k = (s as { kind: string }).kind
      return k.replace(/_/g, ' ')
    }
  }
}

/** Small eyebrow above each step in the active session. */
export function friendlyPackStepEyebrow(s: DayPracticeStep): string {
  switch (s.kind) {
    case 'short_recap':
      return 'Warm-up'
    case 'theme_anchor':
      return 'Thread'
    case 'strongest_next':
      return 'Strong finish'
    case 'word_rep':
      return 'Word'
    case 'phrase_rep':
      return 'Phrase'
    case 'correction_rep':
      return 'Smooth the line'
    case 'mini_scenario':
      return 'Mini moment'
    case 'read_aloud':
      return 'Read aloud'
    case 'listening_burst':
      return 'Listening'
    case 'coach_debrief':
      return 'Coach moment'
    case 'pack_meta':
      return 'Pack'
    default: {
      const k = (s as { kind: string }).kind
      return k.replace(/_/g, ' ')
    }
  }
}
