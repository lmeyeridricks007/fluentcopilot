import { describe, expect, it } from 'vitest'
import { chunkDutchReferenceForCoaching } from './sentenceChunkingForReference'

describe('chunkDutchReferenceForCoaching', () => {
  it('splits on comma like the coaching example', () => {
    const c = chunkDutchReferenceForCoaching('Mag ik een koffie, alstublieft?')
    expect(c.length).toBeGreaterThanOrEqual(2)
    expect(c.join(' ').toLowerCase()).toContain('mag ik')
    expect(c.some((x) => x.toLowerCase().includes('alstublieft'))).toBe(true)
  })

  it('returns a single chunk for short text', () => {
    expect(chunkDutchReferenceForCoaching('Dank je wel.')).toEqual(['Dank je wel'])
  })
})
