/**
 * Deterministic shuffle for MCQ / chip options so the keyed answer is not always first
 * in JSON, while keeping the same order on SSR and client (no hydration mismatch).
 */
function seedFromStrings(id: string, parts: readonly string[]): number {
  const s = `${id}\u0000${parts.join('\u0001')}`
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0 || 1
}

/**
 * Fisher–Yates with a seeded PRNG (LCG) derived from step + option text.
 */
export function shuffleMcqOptions<T>(exerciseId: string, options: readonly T[]): T[] {
  if (options.length <= 1) return [...options]
  const seed = seedFromStrings(
    exerciseId,
    options.map((x) => String(x))
  )
  const mod = 0x7fffffff
  let state = seed
  const next = () => {
    // JS `%` can be negative; negative `next()` yields invalid Fisher–Yates indices.
    state = Math.imul(state, 48271) % mod
    if (state < 0) state += mod
    state = state || 1
    return state / mod
  }
  const a = [...options]
  for (let i = a.length - 1; i > 0; i--) {
    // `next()` can be exactly 1 when state === 0x7fffffff; then floor(1 * (i+1)) === i+1 is out of range
    // and the swap writes undefined into the array (blank options + broken React keys).
    const j = Math.min(Math.floor(next() * (i + 1)), i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
