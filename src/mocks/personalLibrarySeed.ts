/**
 * Seed content for Library — personal Dutch bank (mock until backend).
 */

export type SavedWordItem = {
  id: string
  nl: string
  en: string
  exampleNl?: string
  savedAt: string
  /** Provenance when saved from Feature 1 chat (mock; future sync) */
  sourceScenarioId?: string
  sourceThreadId?: string
  sourceMessageId?: string
  sourceType?: 'chat_ai' | 'chat_feedback' | 'chat_manual' | 'manual'
}

export type SavedPhraseItem = {
  id: string
  nl: string
  en: string
  context?: string
  savedAt: string
}

export type SavedPlaceItem = {
  id: string
  label: string
  kind:
    | 'supermarket'
    | 'train_station'
    | 'doctor'
    | 'gemeente'
    | 'school'
    | 'work'
    | 'cafe'
    | 'housing'
    | 'other'
  note?: string
  savedAt: string
}

export type CapturedMomentItem = {
  id: string
  title: string
  detail: string
  savedAt: string
  suggestedAction: 'scenario' | 'chat' | 'speaking' | 'read_aloud'
}

export type PhotoCaptureItem = {
  id: string
  label: string
  extractedTextHint?: string
  savedAt: string
}

export const SEED_SAVED_WORDS: SavedWordItem[] = [
  {
    id: 'w1',
    nl: 'afspraak',
    en: 'appointment',
    exampleNl: 'Ik heb morgen een afspraak bij de huisarts.',
    savedAt: '2026-03-26',
  },
  {
    id: 'w2',
    nl: 'bonnetje',
    en: 'receipt',
    exampleNl: 'Mag ik het bonnetje, alstublieft?',
    savedAt: '2026-03-25',
  },
  {
    id: 'w3',
    nl: 'aanvraag',
    en: 'application (formal request)',
    exampleNl: 'De aanvraag is nog in behandeling.',
    savedAt: '2026-03-24',
  },
]

export const SEED_SAVED_PHRASES: SavedPhraseItem[] = [
  {
    id: 'p1',
    nl: 'Kunt u dat herhalen, wat langzamer?',
    en: 'Could you repeat that, a bit slower?',
    context: 'Repair / listening',
    savedAt: '2026-03-27',
  },
  {
    id: 'p2',
    nl: 'Ik wil graag een tasje, alstublieft.',
    en: "I'd like a bag, please.",
    context: 'Shop / checkout',
    savedAt: '2026-03-22',
  },
]

export const SEED_PLACES: SavedPlaceItem[] = [
  { id: 'pl1', label: 'Albert Heijn near home', kind: 'supermarket', savedAt: '2026-03-20' },
  { id: 'pl2', label: 'NS Utrecht Centraal', kind: 'train_station', savedAt: '2026-03-18' },
  { id: 'pl3', label: 'Huisartsenpost', kind: 'doctor', savedAt: '2026-03-15' },
]

export const SEED_CAPTURED_MOMENTS: CapturedMomentItem[] = [
  {
    id: 'm1',
    title: 'Checkout confusion',
    detail: 'Cashier asked something about statiegeld — I froze.',
    savedAt: '2026-03-27',
    suggestedAction: 'scenario',
  },
  {
    id: 'm2',
    title: 'Train announcement',
    detail: 'Heard “vertraging door werkzaamheden” — want to understand variants.',
    savedAt: '2026-03-26',
    suggestedAction: 'chat',
  },
]

export const SEED_PHOTOS: PhotoCaptureItem[] = [
  {
    id: 'ph1',
    label: 'Menu board — lunch spot',
    extractedTextHint: 'Dagmenu · broodjes · koffie',
    savedAt: '2026-03-21',
  },
]
