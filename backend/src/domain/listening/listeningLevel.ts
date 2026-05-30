/** CEFR-like bands for listening content; B2/C1 reserved for expansion without schema churn. */
export const LISTENING_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
export type ListeningLevel = (typeof LISTENING_LEVELS)[number]

export const CORE_LISTENING_LEVELS = ['A1', 'A2', 'B1'] as const
export type CoreListeningLevel = (typeof CORE_LISTENING_LEVELS)[number]

export function isListeningLevel(v: string): v is ListeningLevel {
  return (LISTENING_LEVELS as readonly string[]).includes(v)
}

export function normalizeListeningLevel(v: string | undefined | null, fallback: CoreListeningLevel = 'A2'): ListeningLevel {
  const u = (v ?? '').trim().toUpperCase()
  return isListeningLevel(u) ? u : fallback
}
