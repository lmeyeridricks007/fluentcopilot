import type { A2WritingExamBankItem, A2WritingExamStratum } from './a2WritingExamQuestionBank'

export const A2_WRITING_EXAM_STRATUM_ORDER: readonly A2WritingExamStratum[] = [
  'form_fill',
  'formal_email',
  'informal_social',
  'short_note',
] as const

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * One prompt per stratum (four tasks), deterministic from `sessionSeed`, no duplicate bank rows.
 */
export function pickA2WritingStratifiedBankIndices(
  sessionSeed: string,
  bank: readonly A2WritingExamBankItem[],
): number[] {
  const pools: Record<A2WritingExamStratum, number[]> = {
    form_fill: [],
    formal_email: [],
    informal_social: [],
    short_note: [],
  }
  for (let i = 0; i < bank.length; i += 1) {
    pools[bank[i]!.stratum].push(i)
  }

  const rand = mulberry32(hashSeed(`${sessionSeed}\0a2-writing-strata-v2`))
  const used = new Set<number>()
  const out: number[] = []

  const overflow = (): number[] =>
    bank
      .map((_, i) => i)
      .filter((i) => !used.has(i))
      .sort((a, b) => a - b)

  for (const stratum of A2_WRITING_EXAM_STRATUM_ORDER) {
    let candidates = pools[stratum].filter((i) => !used.has(i))
    if (!candidates.length) {
      candidates = [...pools.formal_email, ...pools.informal_social, ...pools.short_note, ...pools.form_fill].filter(
        (i) => !used.has(i),
      )
    }
    if (!candidates.length) {
      const fb = overflow()
      const pick = fb[Math.floor(rand() * fb.length)]!
      out.push(pick)
      used.add(pick)
      continue
    }
    const ix = candidates[Math.floor(rand() * candidates.length)]!
    out.push(ix)
    used.add(ix)
  }

  return out
}
