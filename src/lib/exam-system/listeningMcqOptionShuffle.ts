import { seededShuffle } from './a2SpeakingExamSessionSample'
import type { SpeakingListeningMcqItem } from './speakingListeningMcqBank'

const CANON_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

/**
 * Randomizes option order for listening MCQs (same stem was always `a` in the bank).
 * Remaps `correctOptionIds` to the new canonical ids. Deterministic per session + salt.
 */
export function listeningMcqItemWithShuffledOptions(
  item: SpeakingListeningMcqItem,
  sessionSeed: string,
  uniquenessSalt: string,
): SpeakingListeningMcqItem {
  const { options, correctOptionIds } = item
  const n = options.length
  if (n === 0) return item
  const canon = CANON_IDS.slice(0, n)
  if (canon.length !== n) {
    throw new Error(`listeningMcqItemWithShuffledOptions: unsupported option count ${n}`)
  }
  const order = seededShuffle(
    options.map((_, i) => i),
    sessionSeed,
    `lmcq-opt:${uniquenessSalt}`,
  )
  const oldToNew = new Map<string, string>()
  const newOptions = order.map((fromIx, pos) => {
    const src = options[fromIx]!
    const newId = canon[pos]!
    oldToNew.set(src.id, newId)
    return { ...src, id: newId }
  })
  const newCorrect = correctOptionIds.map((id) => {
    const mapped = oldToNew.get(id)
    if (mapped == null) throw new Error(`listeningMcq shuffle: correct id "${id}" not in option map`)
    return mapped
  })
  return { ...item, options: newOptions, correctOptionIds: newCorrect }
}
