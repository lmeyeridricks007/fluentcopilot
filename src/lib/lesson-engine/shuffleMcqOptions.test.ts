import { describe, expect, it } from 'vitest'
import { shuffleMcqOptions } from './shuffleMcqOptions'

function multisetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}

describe('shuffleMcqOptions', () => {
  it('never drops or injects holes (regression: negative JS modulo + j === i + 1)', () => {
    const base = ['a', 'b', 'c']
    for (let k = 0; k < 10_000; k++) {
      const out = shuffleMcqOptions(`ex-${k}`, base)
      expect(out).toHaveLength(3)
      expect(out.every((x) => x !== undefined && x !== null)).toBe(true)
      expect(multisetEqual(out, base)).toBe(true)
    }
  })

  it('regression: ex-1 used to produce sparse arrays before LCG fix', () => {
    const out = shuffleMcqOptions('ex-1', ['a', 'b', 'c'])
    expect(out).toHaveLength(3)
    expect([...out].sort()).toEqual(['a', 'b', 'c'])
  })
})
