/** Seeded sampling for A2 speaking exam draws (12 unique questions per part from large banks). */

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
 * Deterministic shuffle: same `sessionSeed` + `salt` always yields the same `count` indices
 * (without replacement from `0 .. poolSize - 1`).
 */
export function sampleUniqueIndices(sessionSeed: string, salt: string, count: number, poolSize: number): number[] {
  if (poolSize <= 0 || count <= 0) return []
  const n = Math.min(count, poolSize)
  const idx = Array.from({ length: poolSize }, (_, i) => i)
  const rand = mulberry32(hashSeed(`${sessionSeed}\0${salt}\0a2-speaking-draw`))
  for (let i = poolSize - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = idx[i]!
    idx[i] = idx[j]!
    idx[j] = tmp
  }
  return idx.slice(0, n)
}

/** Deterministic Fisher–Yates shuffle (same seed + salt ⇒ same order). */
export function seededShuffle<T>(items: readonly T[], sessionSeed: string, salt: string): T[] {
  const arr = [...items]
  const rand = mulberry32(hashSeed(`${sessionSeed}\0${salt}\0seeded-shuffle`))
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}
