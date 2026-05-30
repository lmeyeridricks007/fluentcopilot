/**
 * Meaningful micro-wins (not empty gamification) — surfaced after sessions, Coach, Exam.
 */
export type MicroWinKind =
  | 'no_english_switch'
  | 'self_corrected_word_order'
  | 'natural_follow_up'
  | 'saved_word_used'
  | 'more_natural_than_last'

export type MicroWin = {
  id: MicroWinKind
  title: string
  body: string
  /** Optional chips (e.g. Dutch words/phrases) shown under the body on Coach. */
  mentions?: string[]
}

export const MICRO_WIN_COPY: Record<MicroWinKind, MicroWin> = {
  no_english_switch: {
    id: 'no_english_switch',
    title: 'Stayed in Dutch',
    body: 'You held a full stretch without switching to English — that is real-life stamina.',
  },
  self_corrected_word_order: {
    id: 'self_corrected_word_order',
    title: 'Self-repair',
    body: 'You noticed word order and fixed it — that is how fluency builds.',
  },
  natural_follow_up: {
    id: 'natural_follow_up',
    title: 'Natural follow-up',
    body: 'You asked a relevant next question — conversation stayed alive.',
  },
  saved_word_used: {
    id: 'saved_word_used',
    title: 'Word bank in the wild',
    body: 'You used a saved word correctly in context.',
  },
  more_natural_than_last: {
    id: 'more_natural_than_last',
    title: 'Sounded smoother',
    body: 'Rhythm and pacing improved compared to your last attempt.',
  },
}
