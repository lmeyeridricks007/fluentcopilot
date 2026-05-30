import type { ListeningDrillAnswerOption } from '@/lib/listening-mode/listeningDrillPayloadTypes'

/** Strip accents + punctuation for tolerant Dutch/EN matching. */
export function normalizeListeningAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Best MCQ index from typed/spoken text — prefers exact/near match to any option label.
 * Returns null when empty or no reasonable hit.
 */
export function bestOptionMatchIndex(options: ListeningDrillAnswerOption[], typed: string): number | null {
  const n = normalizeListeningAnswer(typed)
  if (!n) return null
  let bestI: number | null = null
  let bestScore = 0
  options.forEach((o, i) => {
    const on = normalizeListeningAnswer(o.label)
    if (!on) return
    let score = 0
    if (on === n) score = 1
    else if (on.includes(n) || n.includes(on)) score = 0.82
    else {
      const words = n.split(' ').filter((w) => w.length > 1)
      const hits = words.filter((w) => on.includes(w)).length
      if (words.length) score = (hits / words.length) * 0.65
    }
    if (score > bestScore) {
      bestScore = score
      bestI = i
    }
  })
  if (bestI == null || bestScore < 0.55) return null
  return bestI
}
