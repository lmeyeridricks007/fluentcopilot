import { SPEAKING_TRAINING_BANK } from '@/lib/exam-prep/speaking/speakingTrainingBank'
import type {
  SpeakingTrainingItem,
  SpeakingTrainingQuestionSubtype,
} from '@/lib/schemas/exam/speakingTrainingItem.schema'

export type PickQuestionOptions = {
  /** Random-ish offset; defaults to time-based */
  seed?: number
  /** Filter by subtype */
  subtype?: SpeakingTrainingQuestionSubtype
  /** Exclude these ids (e.g. last question) */
  excludeIds?: string[]
}

function hashSeed(seed: number, n: number): number {
  return Math.abs((Math.sin(seed + n) * 10000) % 1)
}

/**
 * Select next training question from the seeded bank.
 */
export function pickSpeakingTrainingQuestion(opts: PickQuestionOptions = {}): SpeakingTrainingItem {
  const exclude = new Set(opts.excludeIds ?? [])
  let pool = SPEAKING_TRAINING_BANK.filter((q) => !exclude.has(q.id))
  if (opts.subtype) {
    const sub = pool.filter((q) => q.subtype === opts.subtype)
    if (sub.length > 0) pool = sub
  }
  if (pool.length === 0) {
    pool = SPEAKING_TRAINING_BANK.filter((q) => !exclude.has(q.id))
  }
  if (pool.length === 0) pool = [...SPEAKING_TRAINING_BANK]
  const seed = opts.seed ?? Date.now()
  const idx = Math.floor(hashSeed(seed, pool.length) * pool.length) % pool.length
  return pool[idx]!
}

export function getSpeakingTrainingQuestionById(id: string): SpeakingTrainingItem | undefined {
  return SPEAKING_TRAINING_BANK.find((q) => q.id === id)
}
