import type { QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import {
  buildPersonalizedDayPracticePack,
  type DayPracticePackContent,
  type PracticePackMode,
} from '@/features/quick-capture/dayPackFromCaptures'

const TYPE_PLURAL: Record<string, string> = {
  save_word: 'words',
  save_phrase: 'phrases',
  photo_text: 'photos & signs',
  paste_text: 'pasted lines',
  add_place: 'places',
  log_struggle: 'tricky moments',
  voice_note: 'voice notes',
}

const TYPE_SINGULAR: Record<string, string> = {
  save_word: 'word',
  save_phrase: 'phrase',
  photo_text: 'photo or sign',
  paste_text: 'pasted line',
  add_place: 'place',
  log_struggle: 'tricky moment',
  voice_note: 'voice note',
}

/** Short human summary of what today’s captures look like (for hub preview). */
export function themeSummaryFromCaptures(captures: QuickCaptureItem[]): string {
  if (!captures.length) return 'Add a capture from today — a word, phrase, or moment — to build your pack.'
  const counts = new Map<string, number>()
  for (const c of captures) {
    counts.set(c.captureType, (counts.get(c.captureType) ?? 0) + 1)
  }
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, n]) => {
      const plural = TYPE_PLURAL[t] ?? t.replace(/_/g, ' ')
      const singular = TYPE_SINGULAR[t] ?? plural.replace(/s$/, '')
      return n === 1 ? `one ${singular}` : `${n} ${plural}`
    })
  return `Today’s mix: ${parts.join(', ')}.`
}

export function estimatedMinutesForMode(mode: PracticePackMode): number {
  switch (mode) {
    case 'quick_rep':
      return 3
    case 'deeper_debrief':
      return 9
    default:
      return 5
  }
}

export function previewPackForHub(params: {
  localDate: string
  captures: QuickCaptureItem[]
  mode: PracticePackMode
}): DayPracticePackContent {
  return buildPersonalizedDayPracticePack({
    localDate: params.localDate,
    captures: params.captures,
    themeClusters: [],
    bundleCaptureIds: null,
    mode: params.mode,
  })
}
