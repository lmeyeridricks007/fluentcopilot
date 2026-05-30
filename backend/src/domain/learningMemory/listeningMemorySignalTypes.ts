/**
 * Persistent listening-memory signals on {@link UserLearningProfile.listeningMemorySignals}.
 * Shaped like other weakness rows so merge scoring / focus logic can reuse {@link effectiveWeaknessItemScore}.
 */
/** 0–1 confidence / recovery scale (same semantics as {@link import('./userLearningProfileDocument').Score01}). */
export type ListeningSignalScore01 = number

export const LISTENING_MEMORY_SIGNAL_IDS = [
  'often_misses_times',
  'weak_route_details',
  'replay_before_answer',
  'transcript_reveal_dependent',
  'fast_transport_replies_struggle',
  'misses_short_service_questions',
  'gist_strong_detail_weak',
] as const

export type ListeningMemorySignalId = (typeof LISTENING_MEMORY_SIGNAL_IDS)[number]

export type ListeningMemorySignalRow = {
  signalId: ListeningMemorySignalId
  /** Short learner-facing label (English; surfaced in focus / ribbons when appropriate). */
  label: string
  severityScore: number
  confidence: ListeningSignalScore01
  firstSeenAt: string
  lastSeenAt: string
  occurrences: number
  evidenceRefs: string[]
  recoveryScore: ListeningSignalScore01
  mergeMissStreak?: number
  improving?: boolean
}

export const LISTENING_MEMORY_SIGNAL_LABELS: Record<ListeningMemorySignalId, string> = {
  often_misses_times: 'Times & numbers in audio',
  weak_route_details: 'Route & direction details',
  replay_before_answer: 'Replays before answering',
  transcript_reveal_dependent: 'Leans on transcript reveal',
  fast_transport_replies_struggle: 'Fast travel-desk style replies',
  misses_short_service_questions: 'Short service counter questions',
  gist_strong_detail_weak: 'Gets gist, misses specifics',
}

/** Extra keywords appended into recommendation weakness text (matches scenario UX rules). */
export const LISTENING_MEMORY_SIGNAL_HINT_TAIL: Record<ListeningMemorySignalId, string> = {
  often_misses_times: 'tijd uur minuten nummer appointment schedule',
  weak_route_details: 'route richting naar tussen omleiding prep',
  replay_before_answer: 'replay herhaal luister opnieuw',
  transcript_reveal_dependent: 'transcript tekst meelezen',
  fast_transport_replies_struggle: 'trein station platform OV metro bus vertraging ticket',
  misses_short_service_questions: 'shop winkel kassa bestel service counter',
  gist_strong_detail_weak: 'detail specifiek precies getal tijd',
}

export function isListeningMemorySignalId(v: string): v is ListeningMemorySignalId {
  return (LISTENING_MEMORY_SIGNAL_IDS as readonly string[]).includes(v)
}
