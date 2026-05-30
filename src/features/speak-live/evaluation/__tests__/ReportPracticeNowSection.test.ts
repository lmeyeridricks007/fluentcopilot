/**
 * Tests for the per-loop content-preview extractor on the post-session "Practice now" cards.
 *
 * The headline complaint: the Stretch card said "Practice these weak words" but never listed
 * which words. These tests pin the contract that for every loop type with a meaningful
 * "what am I about to practice?" answer, the card surfaces it.
 */
import { describe, expect, it } from 'vitest'
import type { ApiPersonalizedTrainingLoop } from '@/lib/api/apiTypes'
import { extractLoopPreview } from '../ReportPracticeNowSection'

function loop(
  overrides: Partial<ApiPersonalizedTrainingLoop> & { loopType: ApiPersonalizedTrainingLoop['loopType']; payload: unknown },
): ApiPersonalizedTrainingLoop {
  return {
    id: 'loop-1',
    userId: 'user-1',
    sourceSessionId: 'session-1',
    threadId: null,
    sourceType: 'speak_live',
    sourceScenarioId: null,
    loopSlot: 0,
    title: 'Practice rep',
    subtitle: null,
    reason: '',
    targetSkills: [],
    targetWeaknessKeys: [],
    estimatedMinutes: 1,
    difficulty: 'easy',
    createdAt: '2026-05-15T20:00:00.000Z',
    updatedAt: '2026-05-15T20:00:00.000Z',
    expiresAt: null,
    status: 'pending',
    confidence: 'high',
    priorityScore: 0,
    dedupeKey: null,
    ...overrides,
  }
}

describe('extractLoopPreview', () => {
  describe('weak_words', () => {
    it('surfaces the actual words from payload.words as chips (the headline bug)', () => {
      const r = extractLoopPreview(
        loop({ loopType: 'weak_words', payload: { words: ['winkelwagen', 'rekening', 'alstublieft'] } }),
      )
      expect(r).toEqual({ kind: 'chips', label: 'Words', items: ['winkelwagen', 'rekening', 'alstublieft'] })
    })

    it('caps the chip count at 6 so long word lists do not blow out the card height', () => {
      const r = extractLoopPreview(
        loop({
          loopType: 'weak_words',
          payload: { words: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
        }),
      )
      expect(r?.kind).toBe('chips')
      if (r?.kind === 'chips') expect(r.items).toHaveLength(6)
    })

    it('returns null when payload is missing words (so the card does not render an empty section)', () => {
      expect(extractLoopPreview(loop({ loopType: 'weak_words', payload: {} }))).toBeNull()
      expect(extractLoopPreview(loop({ loopType: 'weak_words', payload: null }))).toBeNull()
      expect(extractLoopPreview(loop({ loopType: 'weak_words', payload: { words: [] } }))).toBeNull()
    })

    it('strips empty / whitespace-only entries so the chip row never renders blank pills', () => {
      const r = extractLoopPreview(
        loop({ loopType: 'weak_words', payload: { words: ['hond', '', '   ', 'kat'] } }),
      )
      expect(r).toEqual({ kind: 'chips', label: 'Words', items: ['hond', 'kat'] })
    })
  })

  describe('pronunciation_drill', () => {
    it('surfaces payload.words as chips with the "Words" label', () => {
      const r = extractLoopPreview(
        loop({ loopType: 'pronunciation_drill', payload: { words: ['gisteren', 'graag'] } }),
      )
      expect(r).toEqual({ kind: 'chips', label: 'Words', items: ['gisteren', 'graag'] })
    })
  })

  describe('read_aloud_fix', () => {
    it('surfaces payload.targetWords as chips with a "Focus words" label', () => {
      const r = extractLoopPreview(
        loop({ loopType: 'read_aloud_fix', payload: { targetWords: ['bestelling', 'bevestiging'] } }),
      )
      expect(r).toEqual({ kind: 'chips', label: 'Focus words', items: ['bestelling', 'bevestiging'] })
    })
  })

  describe('retry_sentence', () => {
    it('shows the corrected version as a quote so the user can preview the rep target', () => {
      const r = extractLoopPreview(
        loop({
          loopType: 'retry_sentence',
          payload: { correctedVersion: 'Mag ik een koffie alstublieft?' },
        }),
      )
      expect(r).toEqual({ kind: 'quote', label: 'You will practice', text: 'Mag ik een koffie alstublieft?' })
    })
  })

  describe('mini_scenario', () => {
    it('shows openingPrompt as a quote labelled "Opening line" when it is a real line', () => {
      const r = extractLoopPreview(
        loop({
          loopType: 'mini_scenario',
          payload: {
            openingPrompt: 'Goedemiddag! Wat wilt u bestellen?',
            objective: 'Order a coffee',
          },
        }),
      )
      expect(r).toEqual({
        kind: 'quote',
        label: 'Opening line',
        text: 'Goedemiddag! Wat wilt u bestellen?',
      })
    })

    it('IGNORES the legacy English coach-meta opener "Jump in with your first line — keep it simple and direct." (the user-reported bug) and falls back to supportingPhrase', () => {
      const r = extractLoopPreview(
        loop({
          loopType: 'mini_scenario',
          payload: {
            openingPrompt: 'Jump in with your first line — keep it simple and direct.',
            supportingPhrase: 'Mag ik een koffie alstublieft?',
            objective: 'Order a coffee',
          },
        }),
      )
      expect(r).toEqual({
        kind: 'quote',
        label: 'Try this line',
        text: 'Mag ik een koffie alstublieft?',
      })
    })

    it('IGNORES the legacy "Stay in the same real-life beat as your capture. Anchor: …" Quick Capture opener and uses the objective as a fallback', () => {
      const r = extractLoopPreview(
        loop({
          loopType: 'mini_scenario',
          payload: {
            openingPrompt: 'Stay in the same real-life beat as your capture. Anchor: hoi',
            objective: 'Retry this situation (cafe).',
          },
        }),
      )
      expect(r).toEqual({ kind: 'quote', label: 'Goal', text: 'Retry this situation (cafe).' })
    })

    it('IGNORES bare "Anchor: …" leftovers from legacy persisted loops', () => {
      const r = extractLoopPreview(
        loop({
          loopType: 'mini_scenario',
          payload: {
            openingPrompt: 'Anchor: a stale anchor line that should not surface',
            supportingPhrase: 'Mag ik betalen?',
          },
        }),
      )
      expect(r).toEqual({ kind: 'quote', label: 'Try this line', text: 'Mag ik betalen?' })
    })

    it('keeps a real Dutch opener that happens to begin with an English-looking word like "Excuse"', () => {
      /** Defensive: the meta-detector must not over-match. Lines starting with "Excuse me" etc.
       *  are perfectly valid openers and should still surface under "Opening line". */
      const r = extractLoopPreview(
        loop({
          loopType: 'mini_scenario',
          payload: {
            openingPrompt: 'Excuse me, where is the train station?',
          },
        }),
      )
      expect(r).toEqual({
        kind: 'quote',
        label: 'Opening line',
        text: 'Excuse me, where is the train station?',
      })
    })

    it('falls back to objective with a "Goal" label (NOT "Opening line") when neither opener nor supportingPhrase exist', () => {
      const r = extractLoopPreview(
        loop({
          loopType: 'mini_scenario',
          payload: { objective: 'Order a coffee', openingPrompt: '' },
        }),
      )
      expect(r).toEqual({ kind: 'quote', label: 'Goal', text: 'Order a coffee' })
    })

    it('returns null when payload has nothing renderable', () => {
      expect(extractLoopPreview(loop({ loopType: 'mini_scenario', payload: {} }))).toBeNull()
    })
  })

  describe('question_drill', () => {
    it('shows the first example question as a quote', () => {
      const r = extractLoopPreview(
        loop({
          loopType: 'question_drill',
          payload: { exampleQuestions: ['Hoe laat begint de les?', 'Waar is het toilet?'] },
        }),
      )
      expect(r?.kind).toBe('quote')
      if (r?.kind === 'quote') expect(r.text).toBe('Hoe laat begint de les?')
    })
  })

  describe('storytelling_drill', () => {
    it('shows the prompt as a quote', () => {
      const r = extractLoopPreview(
        loop({ loopType: 'storytelling_drill', payload: { prompt: 'Vertel over je ochtend.' } }),
      )
      expect(r).toEqual({ kind: 'quote', label: 'Prompt', text: 'Vertel over je ochtend.' })
    })
  })

  describe('structure_drill', () => {
    it('shows the first prompt as a quote', () => {
      const r = extractLoopPreview(
        loop({
          loopType: 'structure_drill',
          payload: { prompts: ['Maak een vraag met "wanneer".', 'Maak een vraag met "waar".'] },
        }),
      )
      expect(r?.kind).toBe('quote')
      if (r?.kind === 'quote') expect(r.text).toBe('Maak een vraag met "wanneer".')
    })
  })

  describe('listening loop types', () => {
    /** Listening loops are audio-driven; the card body already conveys context — no preview. */
    it('returns null for listening_burst (no chips/quote needed)', () => {
      expect(
        extractLoopPreview(loop({ loopType: 'listening_burst', payload: { packId: 'p1' } })),
      ).toBeNull()
    })
  })

  describe('robustness', () => {
    it('safely returns null when payload is not an object (string, number, undefined)', () => {
      expect(
        extractLoopPreview(loop({ loopType: 'weak_words', payload: 'oops' as unknown })),
      ).toBeNull()
      expect(
        extractLoopPreview(loop({ loopType: 'weak_words', payload: 42 as unknown })),
      ).toBeNull()
      expect(
        extractLoopPreview(loop({ loopType: 'weak_words', payload: undefined as unknown })),
      ).toBeNull()
    })

    it('safely returns null when words is the wrong shape (object instead of array)', () => {
      expect(
        extractLoopPreview(
          loop({ loopType: 'weak_words', payload: { words: { not: 'an array' } as unknown } }),
        ),
      ).toBeNull()
    })

    it('drops non-string entries from a mixed array (defensive against bad upstream data)', () => {
      const r = extractLoopPreview(
        loop({
          loopType: 'weak_words',
          payload: { words: ['hond', 42 as unknown, null as unknown, 'kat'] },
        }),
      )
      expect(r).toEqual({ kind: 'chips', label: 'Words', items: ['hond', 'kat'] })
    })
  })
})
