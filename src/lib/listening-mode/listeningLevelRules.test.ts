import { describe, expect, it } from 'vitest'
import { effectiveSpeechRate, levelCoachCopy } from '@/lib/listening-mode/listeningLevelRules'

describe('listeningLevelRules', () => {
  describe('effectiveSpeechRate', () => {
    it('caps A1 speech rate for calmer audio', () => {
      expect(effectiveSpeechRate('A1', 0.92)).toBeLessThanOrEqual(0.86)
      expect(effectiveSpeechRate('A1', 0.8)).toBe(0.8)
    })

    it('raises floor for B1 so clips stay challenging', () => {
      expect(effectiveSpeechRate('B1', 0.88)).toBeGreaterThanOrEqual(0.94)
      expect(effectiveSpeechRate('B1', 0.96)).toBe(0.96)
    })

    it('passes through clip base rate at A2', () => {
      expect(effectiveSpeechRate('A2', 0.91)).toBe(0.91)
    })
  })

  describe('levelCoachCopy', () => {
    it('returns distinct coach copy per CEFR band', () => {
      const a1 = levelCoachCopy('A1')
      const a2 = levelCoachCopy('A2')
      const b1 = levelCoachCopy('B1')
      expect(a1).toContain('A1')
      expect(a2).toContain('A2')
      expect(b1).toContain('B1')
      expect(new Set([a1, a2, b1]).size).toBe(3)
    })
  })
})
