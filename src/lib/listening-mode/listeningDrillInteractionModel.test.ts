import { describe, expect, it } from 'vitest'
import {
  drillInteractionPhase,
  listeningPostAnswerRevealSurfaceAllowed,
  listeningSlowReplayUnlocked,
} from '@/lib/listening-mode/listeningDrillInteractionModel'

describe('listeningDrillInteractionModel', () => {
  describe('drillInteractionPhase', () => {
    it('is answer before lock-in and result after', () => {
      expect(drillInteractionPhase(false)).toBe('answer')
      expect(drillInteractionPhase(true)).toBe('result')
    })
  })

  describe('replay / reveal contract (FluentCopilot)', () => {
    it('slow replay unlocks only after submit', () => {
      expect(listeningSlowReplayUnlocked(false)).toBe(false)
      expect(listeningSlowReplayUnlocked(true)).toBe(true)
    })

    it('allows reveal surface after submit or when transcript peek was used', () => {
      expect(listeningPostAnswerRevealSurfaceAllowed(false, false)).toBe(false)
      expect(listeningPostAnswerRevealSurfaceAllowed(true, false)).toBe(true)
      expect(listeningPostAnswerRevealSurfaceAllowed(false, true)).toBe(true)
      expect(listeningPostAnswerRevealSurfaceAllowed(true, true)).toBe(true)
    })
  })
})
